import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET /api/transactions/auto-release
// Cron endpoint: auto-completes DELIVERED transactions past their auto_release_at deadline (3 days).
// Call this via Vercel Cron or an external scheduler every hour.
export async function GET() {
    try {
        const now = new Date().toISOString();

        // Find all DELIVERED transactions past auto_release_at
        const { data: expiredTransactions, error: findError } = await supabase
            .from("transactions")
            .select("id, seller_id, buyer_id, price, total_amount, title")
            .eq("status", "DELIVERED")
            .not("auto_release_at", "is", null)
            .lte("auto_release_at", now);

        if (findError) {
            console.error("[Auto-Release] Find error:", findError);
            return NextResponse.json({ error: "Failed to query transactions" }, { status: 500 });
        }

        if (!expiredTransactions || expiredTransactions.length === 0) {
            return NextResponse.json({ message: "No transactions to auto-release", count: 0 });
        }

        let released = 0;

        for (const tx of expiredTransactions) {
            // Update status to COMPLETED
            const { error: updateError } = await supabase
                .from("transactions")
                .update({ status: "COMPLETED" })
                .eq("id", tx.id);

            if (updateError) {
                console.error(`[Auto-Release] Failed to complete ${tx.id}:`, updateError);
                continue;
            }

            // Credit seller wallet
            const sellerPayout = tx.price;
            const { error: walletError } = await supabase.rpc(
                "increment_wallet_balance",
                { user_id: tx.seller_id, amount: sellerPayout }
            );

            if (walletError) {
                const { data: sellerData } = await supabase
                    .from("users")
                    .select("wallet_balance")
                    .eq("id", tx.seller_id)
                    .single();
                if (sellerData) {
                    await supabase
                        .from("users")
                        .update({ wallet_balance: (sellerData.wallet_balance || 0) + sellerPayout })
                        .eq("id", tx.seller_id);
                }
            }

            // Increment reputation for both
            for (const userId of [tx.seller_id, tx.buyer_id]) {
                const { data: userData } = await supabase
                    .from("users")
                    .select("reputation_score")
                    .eq("id", userId)
                    .single();
                if (userData) {
                    await supabase
                        .from("users")
                        .update({ reputation_score: (userData.reputation_score || 0) + 1 })
                        .eq("id", userId);
                }
            }

            console.log(`[Auto-Release] Transaction ${tx.id} auto-completed. Seller credited ${sellerPayout}`);
            released++;
        }

        return NextResponse.json({
            message: `Auto-released ${released} transaction(s)`,
            count: released,
        });
    } catch (error) {
        console.error("[Auto-Release] Error:", error);
        return NextResponse.json({ error: "Auto-release failed" }, { status: 500 });
    }
}
