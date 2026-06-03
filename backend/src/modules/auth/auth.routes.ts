import type { FastifyInstance } from "fastify";
import {
  loginController,
  meController,
  signupController,
  refreshTokenController,
} from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", signupController);
  app.post("/login", loginController);
  app.post("/refresh", refreshTokenController);
  app.get("/me", { preHandler: requireAuth }, meController);
}
