import type { FastifyInstance } from "fastify";
import {
  loginController,
  meController,
  signupController,
} from "./auth.controller";

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", signupController);
  app.post("/login", loginController);
  app.get("/me", meController);
}
