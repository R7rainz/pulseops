import type { FastifyReply, FastifyRequest } from "fastify";
import { metaFrom } from "./auth.controller";
import { deviceApproveSchema, deviceTokenSchema } from "./device.schema";
import {
  approveDevice,
  createDeviceAuthorization,
  pollDeviceToken,
} from "./device.service";

function appUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL?.split(",")[0] ||
    "http://localhost:3000"
  );
}

/** Step 1 (CLI, no auth): start a device authorization. */
export async function deviceAuthorizeController(
  _request: FastifyRequest,
  response: FastifyReply,
) {
  const data = await createDeviceAuthorization(appUrl());
  return response.status(200).send({ message: "Device authorization started", data });
}

/** Step 3 (CLI, no auth): poll for tokens. 200 with a status the client checks. */
export async function deviceTokenController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  const { deviceCode } = deviceTokenSchema.parse(request.body);
  const result = await pollDeviceToken(deviceCode, metaFrom(request));

  if (result.status === "expired") {
    return response
      .status(400)
      .send({ error: "expired_token", message: "The device code has expired. Run login again." });
  }
  if (result.status === "pending") {
    return response
      .status(200)
      .send({ message: "Authorization pending", data: { status: "pending" } });
  }
  return response.status(200).send({
    message: "Authorized",
    data: {
      status: "authorized",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
}

/** Step 2 (web app, authenticated): the signed-in user approves the code. */
export async function deviceApproveController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  const { userCode } = deviceApproveSchema.parse(request.body);
  const userId = request.user!.userId;
  await approveDevice(userCode, userId);
  return response.status(200).send({ message: "Device approved. Return to your terminal." });
}
