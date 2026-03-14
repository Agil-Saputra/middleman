import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { SELLER_DEADLINE_MS } from "@/app/lib/types";

const MAYAR_API_KEY = process.env.MAYAR_API_KEY!;

// ─── Check payment status directly from Mayar API ────────────────────────────
// This is a fallback for when the webhook doesn't fire (e.g. local dev,
// misconfigured webhook URL, or network issues).
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Fetch the transaction from our DB
        const { data: transaction, error: findError } = await supabase
            .from("transactions")
            .select("*")
            .eq("id", id)
            .single();

        if (findError || !transaction) {
            return NextResponse.json(
                { error: "Transaksi tidak ditemukan" },
                { status: 404 }
            );
        }

        // Only check if still PENDING
        if (transaction.status !== "PENDING") {
            return NextResponse.json({
                status: transaction.status,
                message: "Transaksi sudah diproses",
                updated: false,
            });
        }

        if (!transaction.mayar_transaction_id) {
            return NextResponse.json(
                { error: "Tidak ada ID pembayaran Mayar" },
                { status: 400 }
            );
        }

        // 2. Check payment status via Mayar API
        // Try fetching the payment link details from Mayar
        let isPaid = false;

        // Try the payment link endpoint
        try {
            const mayarRes = await fetch(
                `https://api.mayar.club/hl/v1/payment/${transaction.mayar_transaction_id}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${MAYAR_API_KEY}`,
                    },
                }
            );

            if (mayarRes.ok) {
                const mayarData = await mayarRes.json();
                console.log("[CheckPayment] Mayar response:", JSON.stringify(mayarData, null, 2));

                // Mayar may signal "paid" via different fields depending on API version
                const data = mayarData.data || mayarData;
                if (
                    data.status === "paid" ||
                    data.status === "completed" ||
                    data.status === "success" ||
                    data.status === true ||
                    data.isPaid === true ||
                    data.statusPayment === "paid" ||
                    data.statusPayment === "completed" ||
                    data.paidAt != null
                ) {
                    isPaid = true;
                }

                // Also check nested transactions array
                if (!isPaid && Array.isArray(data.transactions)) {
                    isPaid = data.transactions.some(
                        (t: { status?: string; isPaid?: boolean }) =>
                            t.status === "paid" || t.status === "completed" || t.isPaid === true
                    );
                }
            } else {
                const errText = await mayarRes.text();
                console.error("[CheckPayment] Mayar API error:", mayarRes.status, errText);
            }
        } catch (apiErr) {
            console.error("[CheckPayment] Failed to reach Mayar API:", apiErr);
        }

        if (!isPaid) {
            return NextResponse.json({
                status: "PENDING",
                message: "Pembayaran belum terdeteksi",
                updated: false,
            });
        }

        // 3. Payment confirmed — update to SECURED
        const { data: updated, error: updateError } = await supabase
            .from("transactions")
            .update({
                status: "SECURED",
                deadline_time: new Date(Date.now() + SELLER_DEADLINE_MS).toISOString(),
            })
            .eq("id", id)
            .eq("status", "PENDING") // Idempotency guard
            .select("*")
            .single();

        if (updateError) {
            console.error("[CheckPayment] Update error:", updateError);
            return NextResponse.json(
                { error: "Gagal memperbarui status transaksi" },
                { status: 500 }
            );
        }

        console.log(`[CheckPayment] Transaction ${id} updated to SECURED`);

        return NextResponse.json({
            status: "SECURED",
            message: "Pembayaran dikonfirmasi — dana diamankan",
            updated: true,
            transaction: updated,
        });
    } catch (error) {
        console.error("[CheckPayment] Error:", error);
        return NextResponse.json(
            { error: "Gagal memeriksa status pembayaran" },
            { status: 500 }
        );
    }
}
