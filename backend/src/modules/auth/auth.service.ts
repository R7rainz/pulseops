import crypto from "node:crypto";
import { prisma } from "../../lib/db";
import { checkPassword, hashPassword } from "../../lib/password";
import { LoginInput, SignupInput, UpdateMeInput, ForgotPasswordInput, ResetPasswordInput } from "./auth.schema";
import { sendResetPasswordEmail } from "../../lib/email";
import {
  signAccessToken,
  verifyAccessTokenIgnoringExpiry,
} from "../../lib/jwt";

export async function signupService(input: SignupInput) {
  // input is an object:
  // {
  //   name: string;
  //   email: string;
  //   password: string;
  // }
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("User alread exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    // Only these fields come back from Prisma.
    // passwordHash will not be returned.
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginService(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await checkPassword(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  const accessToken = signAccessToken({
    userId: user.id,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    accessToken,
  };
}

export async function refreshTokenService(token: string) {
  const payload = verifyAccessTokenIgnoringExpiry(token);
  const accessToken = signAccessToken({ userId: payload.userId });
  return { accessToken };
}

export async function getMeService(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function updateMeService(userId: number, input: UpdateMeInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new Error("Current password is required to set a new password");
    }
    const valid = await checkPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }
  }

  const data: { name?: string; email?: string; passwordHash?: string } = {};
  if (input.name) data.name = input.name;
  if (input.email) data.email = input.email;
  if (input.newPassword) data.passwordHash = await hashPassword(input.newPassword);

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return updated;
}

export async function forgotPasswordService(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    // Don't reveal whether the email exists
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(input.email)}`;

  await sendResetPasswordEmail({ to: input.email, resetLink });
}

export async function resetPasswordService(input: ResetPasswordInput) {
  const hashedToken = crypto.createHash("sha256").update(input.token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired reset token.");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });
}
