import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/app/lib/supabase";

// ─── Mayar Webhook Secret for Signature Verification ─────────────────────────
const MAYAR_WEBHOOK_SECRET = process.env.MAYAR_WEBHOOK_SECRET || "";

// ─── Mayar Webhook Payload Types ─────────────────────────────────────────────
interface MayarWebhookPayload {
    event: string; // e.g. "payment.received"
    data: {
        id: string;
        status: boolean;
        createdAt: string;
        updatedAt: string;
        merchantId: string;
        merchantEmail: string;
        [key: string]: unknown;
    };
}

// ─── Signature Verification ──────────────────────────────────────────────────
// Validates that the webhook request genuinely comes from Mayar.id
// by comparing the HMAC-SHA256 signature in the header with a locally
// computed hash of the raw body using MAYAR_WEBHOOK_SECRET.
//
// If Mayar uses a different verification scheme, adjust accordingly.
function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
): boolean {
    if (!MAYAR_WEBHOOK_SECRET) {
        console.warn(
            "MAYAR_WEBHOOK_SECRET is not set — skipping signature verification."
        );
        // In production, you should return false here to reject unverified requests
        return true;
    }

    if (!signatureHeader) {
        console.error("Missing webhook signature header.");
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", MAYAR_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signatureHeader),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

// ─── Notify Seller ───────────────────────────────────────────────────────────
// TODO: Implement email notification to seller
// This function should send an email to the seller notifying them that:
// 1. The buyer has completed payment
// 2. The funds are now secured in the Middleman escrow system
// 3. The seller can now deliver the digital asset
//
// Suggested implementation:
//   - Use a transactional email service (e.g., Resend, SendGrid, Nodemailer)
//   - Include transaction details: title, amount, buyer info
//   - Include a CTA link to the seller's dashboard for delivering the asset

// ─── POST /api/webhook/mayar ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        // 1. Read raw body for signature verification
        const rawBody = await req.text();
        const signature = req.headers.get("x-mayar-signature");

        // 2. Verify webhook signature
        if (!verifyWebhookSignature(rawBody, signature)) {
            console.error("Webhook signature verification failed.");
            return NextResponse.json(
                { error: "Invalid webhook signature" },
                { status: 401 }
            );
        }

        // 3. Parse the payload
        const payload: MayarWebhookPayload = JSON.parse(rawBody);
        console.log(
            `[Webhook] Received event: ${payload.event}`,
            payload.data.id
        );

        // 4. Handle payment.received event
        if (payload.event === "payment.received") {
            const mayarTransactionId = payload.data.id;

            // Find the transaction in our DB by Mayar's transaction ID
            const { data: transaction, error: findError } = await supabase
                .from("transactions")
                .select(
                    "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
                )
                .eq("mayar_transaction_id", mayarTransactionId)
                .single();

            if (findError || !transaction) {
                console.error(
                    `[Webhook] Transaction not found for Mayar ID: ${mayarTransactionId}`
                );
                // Return 200 to prevent Mayar from retrying — the transaction may
                // have been deleted or was never created on our side
                return NextResponse.json(
                    { error: "Transaction not found" },
                    { status: 200 }
                );
            }

            // Only update if current status is PENDING (idempotency guard)
            if (transaction.status !== "PENDING") {
                console.log(
                    `[Webhook] Transaction ${transaction.id} already has status ${transaction.status} — skipping.`
                );
                return NextResponse.json({
                    message: "Transaction already processed",
                    status: transaction.status,
                });
            }

            // Update transaction status to PAID
            const { data: updatedTransaction, error: updateError } =
                await supabase
                    .from("transactions")
                    .update({ status: "PAID" })
                    .eq("id", transaction.id)
                    .select(
                        "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
                    )
                    .single();

            if (updateError) {
                console.error("Update transaction error:", updateError);
                return NextResponse.json(
                    { error: "Failed to update transaction" },
                    { status: 500 }
                );
            }

            console.log(
                `[Webhook] Transaction ${updatedTransaction!.id} updated to PAID`
            );

            // TODO: Uncomment when email service is implemented
            // await notifySellerPaymentReceived(updatedTransaction);

            return NextResponse.json({
                message: "Payment processed successfully",
                transaction_id: updatedTransaction!.id,
                status: "PAID",
            });
        }

        // 5. Acknowledge other events gracefully
        console.log(`[Webhook] Unhandled event type: ${payload.event}`);
        return NextResponse.json({
            message: `Event ${payload.event} acknowledged`,
        });
    } catch (error) {
        console.error("[Webhook] Error processing Mayar webhook:", error);
        return NextResponse.json(
            { error: "Internal webhook processing error" },
            { status: 500 }
        );
    }
}
