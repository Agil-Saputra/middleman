import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { FEE_PERCENTAGE } from "@/app/lib/types";

// ─── Mayar.id Configuration ──────────────────────────────────────────────────
const MAYAR_API_URL = "https://api.mayar.club/hl/v1/payment/create";
const MAYAR_API_KEY = process.env.MAYAR_API_KEY!;

interface MayarPaymentResponse {
    statusCode: number;
    messages: string;
    data: {
        id: string;
        link: string;
        [key: string]: unknown;
    };
}

// ─── Helper: Create Mayar Payment Link ───────────────────────────────────────
async function createMayarPaymentLink(params: {
    name: string;
    amount: number;
    email: string;
    description: string;
}) {
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

    const response = await fetch(MAYAR_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${MAYAR_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: params.name,
            amount: params.amount,
            email: params.email,
            mobile: "0000000000", // placeholder — Mayar requires this field
            redirectURL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/transactions/success`,
            description: params.description,
            expiredAt,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Mayar API error:", response.status, errorBody);
        throw new Error(`Mayar API error: ${response.status} — ${errorBody}`);
    }

    const data: MayarPaymentResponse = await response.json();
    return data;
}

// ─── GET /api/transactions ───────────────────────────────────────────────────
export async function GET() {
    try {
        const { data: transactions, error } = await supabase
            .from("transactions")
            .select(
                "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
            )
            .order("created_at", { ascending: false });

        if (error) {
            console.error("GET /api/transactions error:", JSON.stringify(error, null, 2));
            return NextResponse.json(
                {
                    error: "Gagal mengambil data transaksi",
                    details: error.message,
                    code: error.code,
                    hint: error.hint,
                    supabase_details: error.details,
                },
                { status: 500 }
            );
        }

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("GET /api/transactions catch error:", error);
        return NextResponse.json(
            {
                error: "Gagal mengambil data transaksi",
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

// ─── POST /api/transactions ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, price, buyer_email, seller_id } = body;

        // ── Validation ──────────────────────────────────────────────────────────
        if (!title || typeof title !== "string" || !title.trim()) {
            return NextResponse.json(
                { error: "Judul transaksi wajib diisi" },
                { status: 400 }
            );
        }

        if (!price || typeof price !== "number" || price <= 0) {
            return NextResponse.json(
                { error: "Harga harus berupa angka positif" },
                { status: 400 }
            );
        }

        if (
            !buyer_email ||
            typeof buyer_email !== "string" ||
            !buyer_email.trim()
        ) {
            return NextResponse.json(
                { error: "Email pembeli wajib diisi" },
                { status: 400 }
            );
        }

        if (!seller_id || typeof seller_id !== "string") {
            return NextResponse.json(
                { error: "Seller ID wajib diisi" },
                { status: 400 }
            );
        }

        // ── Look up buyer by email ──────────────────────────────────────────────
        const { data: buyer, error: buyerError } = await supabase
            .from("users")
            .select("*")
            .eq("email", buyer_email.trim())
            .single();

        if (buyerError || !buyer) {
            console.error("Buyer lookup error:", JSON.stringify(buyerError, null, 2));
            return NextResponse.json(
                {
                    error: `Pembeli dengan email "${buyer_email}" tidak ditemukan`,
                    details: buyerError?.message,
                    code: buyerError?.code,
                    hint: buyerError?.hint,
                    supabase_details: buyerError?.details,
                },
                { status: 404 }
            );
        }

        // ── Verify seller exists ────────────────────────────────────────────────
        const { data: seller, error: sellerError } = await supabase
            .from("users")
            .select("*")
            .eq("id", seller_id)
            .single();

        if (sellerError || !seller) {
            console.error("Seller lookup error:", JSON.stringify(sellerError, null, 2));
            console.log(sellerError)
            return NextResponse.json(
                {
                    error: "Penjual tidak ditemukan",
                    details: sellerError
                },
                { status: 404 }
            );
        }

        // ── Calculate fee and total ─────────────────────────────────────────────
        const fee = Math.round(price * FEE_PERCENTAGE);
        const total_amount = price + fee;

        // ── Step 1: Save transaction to DB with PENDING status ──────────────────
        const { data: transaction, error: createError } = await supabase
            .from("transactions")
            .insert({
                title: title.trim(),
                price,
                fee,
                total_amount,
                status: "PENDING",
                buyer_id: buyer.id,
                seller_id: seller.id,
            })
            .select(
                "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
            )
            .single();

        if (createError || !transaction) {
            console.error("Create transaction error:", JSON.stringify(createError, null, 2));
            return NextResponse.json(
                {
                    error: "Gagal membuat transaksi",
                    details: createError?.message,
                    code: createError?.code,
                    hint: createError?.hint,
                    supabase_details: createError?.details,
                },
                { status: 500 }
            );
        }

        // ── Step 2: Create payment link via Mayar.id ────────────────────────────
        try {
            const mayarResponse = await createMayarPaymentLink({
                name: title.trim(),
                amount: total_amount,
                email: buyer_email.trim(),
                description: `Pembayaran untuk "${title.trim()}" — Middleman Escrow`,
            });

            // ── Step 3: Update transaction with Mayar payment link & ID ─────────
            const { data: updatedTransaction, error: updateError } =
                await supabase
                    .from("transactions")
                    .update({
                        mayar_payment_link: mayarResponse.data.link,
                        mayar_transaction_id: mayarResponse.data.id,
                    })
                    .eq("id", transaction.id)
                    .select(
                        "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
                    )
                    .single();

            if (updateError) {
                console.error("Update transaction with Mayar error:", JSON.stringify(updateError, null, 2));
            }

            return NextResponse.json(
                {
                    transaction: updatedTransaction ?? transaction,
                    payment_link: mayarResponse.data.link,
                },
                { status: 201 }
            );
        } catch (mayarError) {
            // Mayar call failed, but transaction is saved — return with warning
            console.error("Mayar payment link creation failed:", mayarError);
            return NextResponse.json(
                {
                    transaction,
                    payment_link: null,
                    warning:
                        "Transaksi berhasil disimpan, namun pembuatan link pembayaran gagal. Silakan coba lagi.",
                },
                { status: 201 }
            );
        }
    } catch (error) {
        console.error("POST /api/transactions catch error:", error);
        return NextResponse.json(
            {
                error: "Gagal membuat transaksi",
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}
