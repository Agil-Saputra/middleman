import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/transactions/[id]/dispute — buyer raises a dispute
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { reason } = body;

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

        // TODO: Verify that the requesting user is the buyer
        // if (currentUserId !== transaction.buyer_id) {
        //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        // }

        // Update transaction status to DISPUTED
        const { data: updatedTransaction, error: updateError } = await supabase
            .from("transactions")
            .update({ status: "DISPUTED" })
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

        console.log(
            `[Dispute] Transaction ${id} disputed. Reason: ${reason || "Not provided"}`
        );

        // TODO: Send notification emails to both buyer and seller
        // TODO: Create a dispute record in a Dispute table for admin review
        // TODO: Notify admin/support team for manual resolution

        return NextResponse.json(
            {
                message:
                    "Dispute berhasil diajukan. Tim Middleman akan meninjau kasus ini.",
                transaction: updatedTransaction,
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
