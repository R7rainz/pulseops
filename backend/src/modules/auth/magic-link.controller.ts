import type { FastifyReply, FastifyRequest } from "fastify";
import { magicLinkRequestSchema, magicLinkVerifySchema } from "./auth.schema";
import { requestMagicLinkService, verifyMagicLinkService } from "./magic-link.service";
import { metaFrom } from "./auth.controller";

export async function magicLinkRequestController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = magicLinkRequestSchema.parse(request.body);
    await requestMagicLinkService(body);
    return response.status(200).send({
      message: "If that email is registered, a sign-in link has been sent.",
    });
  } catch (error: any) {
    if (error?.issues) {
      const messages = error.issues.map((i: any) => i.message).join("; ");
      return response.status(400).send({ message: messages || "Invalid input" });
    }
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Request failed",
    });
  }
}

export async function magicLinkVerifyController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = magicLinkVerifySchema.parse(request.body);
    const result = await verifyMagicLinkService(body, metaFrom(request));
    return response.status(200).send({ message: "Signed in", data: result });
  } catch (error: any) {
    if (error?.issues) {
      const messages = error.issues.map((i: any) => i.message).join("; ");
      return response.status(400).send({ message: messages || "Invalid input" });
    }
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Sign-in failed",
    });
  }
}
