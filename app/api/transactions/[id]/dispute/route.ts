import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/transactions/[id]/dispute — buyer raises a dispute with evidence
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { reason, evidence_url } = body;

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return NextResponse.json(
                { error: "Alasan sengketa wajib diisi" },
                { status: 400 }
            );
        }

        // ── Find transaction ────────────────────────────────────────────────────
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

        // Only allow dispute from DELIVERED status
        if (transaction.status !== "DELIVERED") {
            return NextResponse.json(
                {
                    error: `Dispute hanya bisa diajukan dari status DELIVERED. Status saat ini: ${transaction.status}`,
                },
                { status: 400 }
            );
        }

        // Update transaction status to DISPUTED and store the reason
        const { data: updatedTransaction, error: updateError } = await supabase
            .from("transactions")
            .update({
                status: "DISPUTED",
                dispute_reason: reason.trim(),
            })
            .eq("id", id)
            .select(
                "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
            )
            .single();

        if (updateError) {
            console.error("Update transaction error:", updateError);
            return NextResponse.json(
                { error: "Gagal mengajukan dispute" },
                { status: 500 }
            );
        }

        // Save buyer's evidence
        if (evidence_url) {
            await supabase.from("dispute_evidence").insert({
                transaction_id: id,
                submitted_by: transaction.buyer_id,
                evidence_type: "buyer",
                file_url: evidence_url.trim(),
                description: reason.trim(),
            });
        }

        // Refund: return funds to buyer (credit buyer wallet)
        const refundAmount = transaction.total_amount;
        const { error: walletError } = await supabase.rpc(
            "increment_wallet_balance",
            { user_id: transaction.buyer_id, amount: refundAmount }
        );

        if (walletError) {
            console.warn("RPC increment_wallet_balance not found, using manual update:", walletError.message);
            const { data: buyerData } = await supabase
                .from("users")
                .select("wallet_balance")
                .eq("id", transaction.buyer_id)
                .single();
            if (buyerData) {
                await supabase
                    .from("users")
                    .update({ wallet_balance: (buyerData.wallet_balance || 0) + refundAmount })
                    .eq("id", transaction.buyer_id);
            }
        }

        // Update status to REFUNDED after crediting
        await supabase
            .from("transactions")
            .update({ status: "REFUNDED" })
            .eq("id", id);

        console.log(
            `[Dispute] Transaction ${id} disputed & refunded. Reason: ${reason}. Refund: ${refundAmount}`
        );

        return NextResponse.json(
            {
                message: "Sengketa berhasil diajukan. Dana telah dikembalikan ke wallet pembeli.",
                transaction: updatedTransaction,
                refund_amount: refundAmount,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("POST /api/transactions/[id]/dispute error:", error);
        return NextResponse.json(
            { error: "Gagal mengajukan dispute" },
            { status: 500 }
        );
    }
}
