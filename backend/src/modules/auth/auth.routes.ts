import type { FastifyInstance } from "fastify";
import {
  loginController,
  meController,
  signupController,
  refreshTokenController,
  updateMeController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", signupController);
  app.post("/login", loginController);
  app.post("/refresh", refreshTokenController);
  app.get("/me", { preHandler: requireAuth }, meController);
  app.patch("/me", { preHandler: requireAuth }, updateMeController);
  app.post("/forgot-password", forgotPasswordController);
  app.post("/reset-password", resetPasswordController);
}
