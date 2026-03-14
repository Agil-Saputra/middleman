import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/transactions/[id]/evidence — submit evidence for a disputed transaction
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { file_url, description, submitted_by, evidence_type } = body;

        if (!file_url || typeof file_url !== "string" || !file_url.trim()) {
            return NextResponse.json(
                { error: "Link bukti wajib diisi" },
                { status: 400 }
            );
        }

        if (!evidence_type || !["buyer", "seller"].includes(evidence_type)) {
            return NextResponse.json(
                { error: "Tipe bukti harus 'buyer' atau 'seller'" },
                { status: 400 }
            );
        }

        // Verify transaction exists and is in DISPUTED or REFUNDED status
        const { data: transaction, error: findError } = await supabase
            .from("transactions")
            .select("id, status, buyer_id, seller_id")
            .eq("id", id)
            .single();

        if (findError || !transaction) {
            return NextResponse.json(
                { error: "Transaksi tidak ditemukan" },
                { status: 404 }
            );
        }

        if (!["DISPUTED", "REFUNDED"].includes(transaction.status)) {
            return NextResponse.json(
                { error: "Bukti hanya bisa diajukan untuk transaksi yang sedang dalam sengketa" },
                { status: 400 }
            );
        }

        // Save the evidence
        const { data: evidence, error: insertError } = await supabase
            .from("dispute_evidence")
            .insert({
                transaction_id: id,
                submitted_by: submitted_by || (evidence_type === "buyer" ? transaction.buyer_id : transaction.seller_id),
                evidence_type,
                file_url: file_url.trim(),
                description: description?.trim() || null,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert evidence error:", insertError);
            return NextResponse.json(
                { error: "Gagal menyimpan bukti" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Bukti berhasil disimpan", evidence },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/transactions/[id]/evidence error:", error);
        return NextResponse.json(
            { error: "Gagal menyimpan bukti" },
            { status: 500 }
        );
    }
}

// GET /api/transactions/[id]/evidence — fetch all evidence for a transaction
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: evidence, error } = await supabase
            .from("dispute_evidence")
            .select("*")
            .eq("transaction_id", id)
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json(
                { error: "Gagal mengambil bukti" },
                { status: 500 }
            );
        }

        return NextResponse.json(evidence || []);
    } catch (error) {
        console.error("GET /api/transactions/[id]/evidence error:", error);
        return NextResponse.json(
            { error: "Gagal mengambil bukti" },
            { status: 500 }
        );
    }
}
