import type { FastifyReply, FastifyRequest } from "fastify";
import {
  twoFactorEnableSchema,
  twoFactorVerifySchema,
  twoFactorDisableSchema,
} from "./auth.schema";
import {
  setupTwoFactorService,
  enableTwoFactorService,
  disableTwoFactorService,
  verifyTwoFactorService,
} from "./mfa.service";
import { metaFrom } from "./auth.controller";

function badRequest(response: FastifyReply, error: any, fallback: string) {
  if (error?.issues) {
    const messages = error.issues.map((i: any) => i.message).join("; ");
    return response.status(400).send({ message: messages || "Invalid input" });
  }
  return response.status(400).send({
    message: error instanceof Error ? error.message : fallback,
  });
}

export async function twoFactorSetupController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const result = await setupTwoFactorService(request.user.userId);
    return response.status(200).send({ message: "Scan the QR code", data: result });
  } catch (error) {
    return badRequest(response, error, "Setup failed");
  }
}

export async function twoFactorEnableController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = twoFactorEnableSchema.parse(request.body);
    const result = await enableTwoFactorService(request.user.userId, body);
    return response.status(200).send({
      message: "Two-factor authentication enabled",
      data: result,
    });
  } catch (error) {
    return badRequest(response, error, "Enable failed");
  }
}

export async function twoFactorDisableController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = twoFactorDisableSchema.parse(request.body);
    await disableTwoFactorService(request.user.userId, body);
    return response.status(200).send({
      message: "Two-factor authentication disabled",
    });
  } catch (error) {
    return badRequest(response, error, "Disable failed");
  }
}

export async function twoFactorVerifyController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = twoFactorVerifySchema.parse(request.body);
    const result = await verifyTwoFactorService(body, metaFrom(request));
    return response.status(200).send({ message: "Signed in", data: result });
  } catch (error) {
    return badRequest(response, error, "Verification failed");
  }
}
