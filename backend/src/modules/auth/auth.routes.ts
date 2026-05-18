import type { FastifyInstance } from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import { signupController } from "./auth.controller";
import { hashPassword } from "../../lib/password";

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", signupController);
}
