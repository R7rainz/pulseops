import { prisma } from "../../lib/db";
import { checkPassword, hashPassword } from "../../lib/password";
import { LoginInput, SignupInput, UpdateMeInput } from "./auth.schema";
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
