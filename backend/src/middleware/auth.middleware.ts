import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/jwt";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      userId: number;
      role: string;
    };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  response: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response
      .status(401)
      .send({ message: "authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    request.user = {
      userId: payload.userId,
      role: "",
    };
  } catch (error) {
    return response.status(401).send({ message: "Invalid or expired token" });
  }
}
