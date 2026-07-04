import type { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema, signupSchema, updateMeSchema, forgotPasswordSchema, resetPasswordSchema, refreshSchema, logoutSchema, deleteAccountSchema } from "./auth.schema";
import { loginService, signupService, refreshTokenService, logoutService, deleteAccountService, updateMeService, forgotPasswordService, resetPasswordService } from "./auth.service";
import { getMeService } from "./auth.service";
import type { SessionMeta } from "../../lib/session";

/** Capture request metadata to attach to a session for auditing. */
export function metaFrom(request: FastifyRequest): SessionMeta {
  return {
    userAgent: request.headers["user-agent"] ?? null,
    ip: request.ip,
  };
}

export async function signupController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    //validate request body
    const body = signupSchema.parse(request.body);
    const result = await signupService(body, metaFrom(request));
    return response
      .status(201)
      .send({ message: "User created successfully", data: result });
  } catch (error) {
    //return error response
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Signup Failed",
    });
  }
}

export async function loginController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = loginSchema.parse(request.body);
    const result = await loginService(body, metaFrom(request));
    return response
      .status(200)
      .send({ message: "Login successful", data: result });
  } catch (error) {
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Login Failed",
    });
  }
}

export async function refreshTokenController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const { refreshToken } = refreshSchema.parse(request.body);
    const result = await refreshTokenService(refreshToken);

    return response.status(200).send({
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    return response.status(401).send({
      message: error instanceof Error ? error.message : "Token refresh failed",
    });
  }
}

export async function logoutController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const { refreshToken } = logoutSchema.parse(request.body);
    await logoutService(refreshToken);
    return response.status(200).send({ message: "Logged out" });
  } catch (error) {
    // Logout is best-effort — never surface an error that would block the
    // frontend from clearing its cookies.
    return response.status(200).send({ message: "Logged out" });
  }
}

export async function meController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const user = await getMeService(request.user.userId);

    return response
      .status(200)
      .send({ message: "Current user fetched successfully", data: user });
  } catch (error) {
    return response.status(401).send({ message: "Invalid or expired token" });
  }
}

export async function updateMeController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = updateMeSchema.parse(request.body);
    const user = await updateMeService(request.user.userId, body);
    return response
      .status(200)
      .send({ message: "Profile updated successfully", data: user });
  } catch (error: any) {
    if (error?.issues) {
      const messages = error.issues.map((i: any) => i.message).join("; ");
      return response.status(400).send({ message: messages || "Update failed" });
    }
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Update failed",
    });
  }
}

export async function deleteMeController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = deleteAccountSchema.parse(request.body ?? {});
    await deleteAccountService(request.user.userId, body);
    return response.status(200).send({ message: "Account deleted" });
  } catch (error: any) {
    if (error?.issues) {
      const messages = error.issues.map((i: any) => i.message).join("; ");
      return response.status(400).send({ message: messages || "Invalid input" });
    }
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Failed to delete account",
    });
  }
}

export async function forgotPasswordController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = forgotPasswordSchema.parse(request.body);
    await forgotPasswordService(body);
    return response.status(200).send({
      message: "If that email is registered, a reset link has been sent.",
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

export async function resetPasswordController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = resetPasswordSchema.parse(request.body);
    await resetPasswordService(body);
    return response.status(200).send({
      message: "Password has been reset successfully.",
    });
  } catch (error: any) {
    if (error?.issues) {
      const messages = error.issues.map((i: any) => i.message).join("; ");
      return response.status(400).send({ message: messages || "Invalid input" });
    }
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Reset failed",
    });
  }
}
