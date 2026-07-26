import { FastifyReply, FastifyRequest } from "fastify";
import Razorpay from "razorpay";
import { prisma } from "../../lib/db";
import crypto from "crypto"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

// Constant-time compare for hex digests. `crypto.timingSafeEqual` throws on
// length mismatch, which would itself leak length, so guard that first.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export async function razorpayWebhookController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return response.status(500).send({ message: "Webhook secret not configured" });
    }

    const signature = request.headers["x-razorpay-signature"] as string;
    if (!signature) {
      return response.status(401).send({ message: "Missing webhook signature" });
    }

    const rawBody = (request as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      return response.status(400).send({ message: "Missing request body" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (!timingSafeEqualHex(signature, expectedSignature)) {
      return response.status(401).send({ message: "Invalid webhook signature" });
    }

    const event = request.body as {
      event: string;
      payload: {
        subscription?: { entity: { id: string } };
        payment?: { entity: { id: string; status: string } };
      };
    };

    // Which plan state each subscription lifecycle event implies. `charged` is
    // Razorpay's *success* event — it means a renewal was paid, so it must
    // grant PRO. Downgrades come from the halt/cancel/expire events instead.
    const UPGRADE_EVENTS = new Set(["subscription.charged", "subscription.activated"]);
    const DOWNGRADE_EVENTS = new Set([
      "subscription.halted",
      "subscription.cancelled",
      "subscription.completed",
      "subscription.expired",
    ]);

    const isUpgrade = UPGRADE_EVENTS.has(event.event);
    const isDowngrade = DOWNGRADE_EVENTS.has(event.event);

    if (!isUpgrade && !isDowngrade) {
      // Acknowledge unhandled events so Razorpay stops retrying them.
      return response.status(200).send({ message: "Event ignored" });
    }

    const subscriptionId = event.payload.subscription?.entity?.id;
    if (!subscriptionId) {
      return response.status(400).send({ message: "Missing subscription ID in payload" });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { razorpaySubId: subscriptionId },
    });

    if (!workspace) {
      return response.status(404).send({ message: "Workspace not found for subscription" });
    }

    // Idempotency: Razorpay redelivers on any non-2xx, and a charge event can
    // legitimately repeat across billing cycles — so the reference includes the
    // payment id when present.
    const paymentId = event.payload.payment?.entity?.id;
    const reference = `evt:${event.event}:${subscriptionId}:${paymentId ?? "none"}`;

    try {
      await prisma.processedPayment.create({
        data: { workspaceId: workspace.id, reference, kind: event.event },
      });
    } catch {
      // Unique violation — already applied. Ack so retries stop.
      return response.status(200).send({ message: "Already processed" });
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: isUpgrade
        ? { planTier: "PRO", subscriptionStatus: "active" }
        : { planTier: "FREE", subscriptionStatus: "inactive" },
    });

    console.log(
      `[BILLING] Workspace ${workspace.id} ${isUpgrade ? "upgraded to PRO" : "downgraded to FREE"} (${event.event})`,
    );

    return response.status(200).send({ message: "Webhook processed" });
  } catch (error) {
    console.error("[BILLING] Webhook error:", error);
    return response.status(500).send({ message: "Webhook processing failed" });
  }
}

export async function createSubscriptionController(
  request: FastifyRequest<{Params: {workspaceId: string}}>, response: FastifyReply
) {
  try{
    const workspaceId = Number(request.params.workspaceId)

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId
      }
    })

    if(!workspace) return response.status(404).send({
      message: "Workspace not found"
    })

    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PRO_PLAN_ID!,
      total_count: 120,
      customer_notify: 1
    })

    await prisma.workspace.update({
      where: {
        id: workspaceId
      },
      data: {
        razorpaySubId: subscription.id,
        subscriptionStatus: subscription.status
      }
    })

    return response.status(200).send({
      data: {
        subscriptionId: subscription.id,
        key: process.env.RAZORPAY_KEY_ID,
      },
    })
  } catch(error){
      console.error("[BILLING] Failed to initialize subscription: ", error)
      return response.status(500).send({message: "Failed to initialize checkout"})
  }
}

export async function verifyPaymentController(
  request: FastifyRequest<{
    Params: {workspaceId: string},
    Body: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }
  }>,
  response: FastifyReply
) {
  try {
    const workspaceId = Number(request.params.workspaceId)
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = request.body

    const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(razorpay_payment_id + "|" + razorpay_subscription_id).digest("hex")

    if(!timingSafeEqualHex(generatedSignature, razorpay_signature)){
      return response.status(400).send({message: "Cryptographic signature mismatch. Transaction flagged"})
    }

    // A valid signature only proves Razorpay issued *this payment* — it says
    // nothing about which workspace it belongs to. Without this check the same
    // signature could be replayed against every workspace the caller owns.
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { razorpaySubId: true },
    })

    if (!workspace || workspace.razorpaySubId !== razorpay_subscription_id) {
      return response.status(400).send({
        message: "Subscription does not belong to this workspace",
      })
    }

    // Replay guard: the same payment id can only ever upgrade once.
    try {
      await prisma.processedPayment.create({
        data: {
          workspaceId,
          reference: `pay:${razorpay_payment_id}`,
          kind: "verify",
        },
      })
    } catch {
      return response.status(409).send({ message: "Payment already processed" })
    }

    await prisma.workspace.update({
      where: {id: workspaceId},
      data: {
        planTier: "PRO",
        subscriptionStatus: "active",
      }
    })

    return response.status(200).send({
      message: "Telemetry Engine upgraded to Pro Tier",
    })
  }catch(error) {
    console.error("[BILLING] Verification failed: ", error)
    return response.status(500).send({message: "Failed to verify transaction"})
  }
}
