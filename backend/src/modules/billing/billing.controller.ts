import { FastifyReply, FastifyRequest } from "fastify";
import Razorpay from "razorpay";
import { prisma } from "../../lib/db";
import crypto from "crypto"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

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

    const body = JSON.stringify(request.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return response.status(401).send({ message: "Invalid webhook signature" });
    }

    const event = request.body as {
      event: string;
      payload: {
        subscription?: { entity: { id: string } };
        payment?: { entity: { id: string; status: string } };
      };
    };

    if (event.event === "subscription.charged") {
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

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          planTier: "FREE",
          subscriptionStatus: "inactive",
        },
      });

      console.log(`[BILLING] Workspace ${workspace.id} downgraded to FREE (payment failed)`);
    }

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

    if(generatedSignature!== razorpay_signature){
      return response.status(400).send({message: "Cryptographic signature mismatch. Transaction flagged"})
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
