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

const bruteForceLimit = {
  config: {
    rateLimit: { max: 10, timeWindow: "1 minute" },
  },
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", bruteForceLimit, signupController);
  app.post("/login", bruteForceLimit, loginController);
  app.post("/refresh", refreshTokenController);
  app.get("/me", { preHandler: requireAuth }, meController);
  app.patch("/me", { preHandler: requireAuth }, updateMeController);
  app.post("/forgot-password", bruteForceLimit, forgotPasswordController);
  app.post("/reset-password", bruteForceLimit, resetPasswordController);
}
