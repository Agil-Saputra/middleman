import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/transactions/[id]/deliver — seller submits delivery proof
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { file_url, text_proof } = body;

        // ── Validation ──────────────────────────────────────────────────────────
        if (!file_url || typeof file_url !== "string" || !file_url.trim()) {
            return NextResponse.json(
                { error: "Link file wajib diisi" },
                { status: 400 }
            );
        }

        // Validate URL format
        try {
            new URL(file_url.trim());
        } catch {
            return NextResponse.json(
                { error: "Format URL tidak valid" },
                { status: 400 }
            );
        }

        // ── Find transaction ────────────────────────────────────────────────────
        const { data: transaction, error: findError } = await supabase
            .from("transactions")
            .select(
                "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
            )
            .eq("id", id)
            .single();

        if (findError || !transaction) {
            return NextResponse.json(
                { error: "Transaksi tidak ditemukan" },
                { status: 404 }
            );
        }

        // Only allow delivery if status is PAID
        if (transaction.status !== "PAID") {
            return NextResponse.json(
                {
                    error: `Pengiriman hanya bisa dilakukan pada transaksi berstatus PAID. Status saat ini: ${transaction.status}`,
                },
                { status: 400 }
            );
        }

        // TODO: Verify that the requesting user is the seller
        // This requires authentication middleware. For now, we trust the request.
        // if (currentUserId !== transaction.seller_id) {
        //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        // }

        // ── Create DeliveryLog ──────────────────────────────────────────────────
        const { data: deliveryLog, error: logError } = await supabase
            .from("delivery_logs")
            .insert({
                transaction_id: id,
                file_url: file_url.trim(),
                text_proof: text_proof?.trim() || null,
            })
            .select()
            .single();

        if (logError) {
            console.error("Create delivery log error:", logError);
            return NextResponse.json(
                { error: "Gagal menyimpan bukti pengiriman" },
                { status: 500 }
            );
        }

        // ── Update Transaction status to DELIVERED ──────────────────────────────
        const { data: updatedTransaction, error: updateError } = await supabase
            .from("transactions")
            .update({ status: "DELIVERED" })
            .eq("id", id)
            .select(
                "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email), delivery_logs(*)  "
            )
            .single();

        if (updateError) {
            console.error("Update transaction error:", updateError);
            return NextResponse.json(
                { error: "Gagal mengupdate status transaksi" },
                { status: 500 }
            );
        }

        console.log(
            `[Deliver] Transaction ${id} marked as DELIVERED. DeliveryLog: ${deliveryLog.id}`
        );

        return NextResponse.json(
            {
                message: "Aset berhasil dikirim",
                transaction: updatedTransaction,
                delivery_log: deliveryLog,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("POST /api/transactions/[id]/deliver error:", error);
        return NextResponse.json(
            { error: "Gagal mengirim aset" },
            { status: 500 }
        );
    }
}
