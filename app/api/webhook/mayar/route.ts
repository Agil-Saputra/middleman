import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/app/lib/supabase";
import { SELLER_DEADLINE_MS } from "@/app/lib/types";

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
        paymentLinkId?: string;
        paymentLink?: { id: string; [key: string]: unknown };
        link?: string;
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

        // 4. Handle payment event (accept multiple event name variants)
        const paymentEvents = ["payment.received", "payment.success", "payment.completed"];
        if (paymentEvents.includes(payload.event)) {
            // Extract all possible IDs from the webhook payload.
            // Mayar's webhook data.id is often the payment-transaction ID,
            // which differs from the payment-link ID we stored at creation time.
            const possibleIds: string[] = [];

            // data.id — may match if Mayar returns consistent IDs
            if (payload.data.id) possibleIds.push(payload.data.id);
            // data.paymentLinkId — common field for the original link reference
            if (payload.data.paymentLinkId) possibleIds.push(payload.data.paymentLinkId);
            // data.paymentLink.id — nested variant
            if (payload.data.paymentLink?.id) possibleIds.push(payload.data.paymentLink.id);

            console.log("[Webhook] Trying to match with IDs:", possibleIds);

            // Try to find the transaction using any of the possible IDs
            let transaction = null;
            let findError = null;

            for (const candidateId of possibleIds) {
                const { data, error } = await supabase
                    .from("transactions")
                    .select(
                        "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
                    )
                    .eq("mayar_transaction_id", candidateId)
                    .single();

                if (data && !error) {
                    transaction = data;
                    findError = null;
                    console.log(`[Webhook] Matched transaction ${data.id} using ID: ${candidateId}`);
                    break;
                }
                findError = error;
            }

            // Fallback: try matching by payment link URL if Mayar includes the link
            if (!transaction && payload.data.link) {
                const { data, error } = await supabase
                    .from("transactions")
                    .select(
                        "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
                    )
                    .eq("mayar_payment_link", payload.data.link)
                    .single();

                if (data && !error) {
                    transaction = data;
                    findError = null;
                    console.log(`[Webhook] Matched transaction ${data.id} using payment link URL`);

                    // Persist the webhook's transaction ID for future lookups
                    await supabase
                        .from("transactions")
                        .update({ mayar_transaction_id: payload.data.id })
                        .eq("id", data.id);
                }
            }

            if (!transaction) {
                console.error(
                    `[Webhook] Transaction not found for any Mayar ID. Tried:`, possibleIds,
                    `Full payload:`, JSON.stringify(payload, null, 2)
                );
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

            // Update transaction status to SECURED (dana diamankan)
            const { data: updatedTransaction, error: updateError } =
                await supabase
                    .from("transactions")
                    .update({
                        status: "SECURED",
                        deadline_time: new Date(Date.now() + SELLER_DEADLINE_MS).toISOString(),
                    })
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
                `[Webhook] Transaction ${updatedTransaction!.id} updated to SECURED`
            );

            // TODO: Uncomment when email service is implemented
            // await notifySellerPaymentReceived(updatedTransaction);

            return NextResponse.json({
                message: "Payment processed — funds secured in escrow",
                transaction_id: updatedTransaction!.id,
                status: "SECURED",
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
