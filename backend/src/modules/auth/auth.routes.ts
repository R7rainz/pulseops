import type { FastifyInstance } from "fastify";
import {
  loginController,
  meController,
  signupController,
  refreshTokenController,
  logoutController,
  updateMeController,
  deleteMeController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller";
import {
  magicLinkRequestController,
  magicLinkVerifyController,
} from "./magic-link.controller";
import {
  twoFactorSetupController,
  twoFactorEnableController,
  twoFactorDisableController,
  twoFactorVerifyController,
} from "./mfa.controller";
import {
  oauthStartController,
  oauthCallbackController,
  oauthExchangeController,
} from "./oauth.controller";
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
  app.post("/logout", logoutController);
  app.get("/me", { preHandler: requireAuth }, meController);
  app.patch("/me", { preHandler: requireAuth }, updateMeController);
  app.delete("/me", { preHandler: requireAuth }, deleteMeController);
  app.post("/forgot-password", bruteForceLimit, forgotPasswordController);
  app.post("/reset-password", bruteForceLimit, resetPasswordController);

  // Passwordless magic-link sign-in
  app.post("/magic-link/request", bruteForceLimit, magicLinkRequestController);
  app.post("/magic-link/verify", bruteForceLimit, magicLinkVerifyController);

  // TOTP two-factor authentication
  app.post("/2fa/setup", { preHandler: requireAuth }, twoFactorSetupController);
  app.post("/2fa/enable", { preHandler: requireAuth }, twoFactorEnableController);
  app.post("/2fa/disable", { preHandler: requireAuth }, twoFactorDisableController);
  app.post("/2fa/verify", bruteForceLimit, twoFactorVerifyController);

  // OAuth social login (Google, GitHub, Microsoft)
  app.get("/oauth/:provider", oauthStartController);
  app.get("/oauth/:provider/callback", oauthCallbackController);
  app.post("/oauth/exchange", oauthExchangeController);
}
