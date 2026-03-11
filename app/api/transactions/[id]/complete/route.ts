import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/transactions/[id]/complete — buyer confirms receipt & completes transaction
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Only allow completion if status is DELIVERED
        if (transaction.status !== "DELIVERED") {
            return NextResponse.json(
                {
                    error: `Transaksi hanya bisa diselesaikan dari status DELIVERED. Status saat ini: ${transaction.status}`,
                },
                { status: 400 }
            );
        }

        // TODO: Verify that the requesting user is the buyer
        // if (currentUserId !== transaction.buyer_id) {
        //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        // }

        // ── Calculate seller payout (total_amount minus platform fee) ────────
        const sellerPayout = transaction.price; // seller gets the original price (fee was added on top)

        // ── Update transaction status to COMPLETED ──────────────────────────
        const { data: updatedTransaction, error: updateError } = await supabase
            .from("transactions")
            .update({ status: "COMPLETED" })
            .eq("id", id)
            .select(
                "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
            )
            .single();

        if (updateError) {
            console.error("Update transaction error:", updateError);
            return NextResponse.json(
                { error: "Gagal menyelesaikan transaksi" },
                { status: 500 }
            );
        }

        // ── Credit seller wallet ────────────────────────────────────────────
        const { error: walletError } = await supabase.rpc(
            "increment_wallet_balance",
            {
                user_id: transaction.seller_id,
                amount: sellerPayout,
            }
        );

        // Fallback: if the RPC function doesn't exist, do a manual read-then-write
        if (walletError) {
            console.warn(
                "RPC increment_wallet_balance not found, using manual update:",
                walletError.message
            );
            const { data: sellerData } = await supabase
                .from("users")
                .select("wallet_balance")
                .eq("id", transaction.seller_id)
                .single();

            if (sellerData) {
                await supabase
                    .from("users")
                    .update({
                        wallet_balance: sellerData.wallet_balance + sellerPayout,
                    })
                    .eq("id", transaction.seller_id);
            }
        }

        console.log(
            `[Complete] Transaction ${id} completed. Seller ${transaction.seller_id} credited ${sellerPayout}`
        );

        // ── TODO: Mayar Payout/Disbursement Integration ─────────────────────
        // If you want to automatically transfer funds to the seller's bank account
        // instead of (or in addition to) crediting the in-app wallet, integrate
        // Mayar's Disbursement API here:
        //
        // Endpoint: POST https://api.mayar.club/hl/v1/disbursement/create
        // Headers:  Authorization: Bearer ${MAYAR_API_KEY}
        //
        // Request body:
        // {
        //   "amount": sellerPayout,
        //   "bankCode": seller.bank_code,        // e.g. "BCA", "BNI", "MANDIRI"
        //   "accountNumber": seller.bank_account, // seller's bank account number
        //   "accountName": seller.name,
        //   "description": `Payout untuk transaksi "${transaction.title}"`,
        //   "referenceId": transaction.id         // our internal reference
        // }

        return NextResponse.json(
            {
                message:
                    "Transaksi selesai. Dana telah ditambahkan ke wallet penjual.",
                transaction: updatedTransaction,
                seller_payout: sellerPayout,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("POST /api/transactions/[id]/complete error:", error);
        return NextResponse.json(
            { error: "Gagal menyelesaikan transaksi" },
            { status: 500 }
        );
    }
}
