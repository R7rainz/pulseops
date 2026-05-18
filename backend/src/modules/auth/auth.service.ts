import { prisma } from "../../lib/db";
import { hashPassword } from "../../lib/password";
import { SignupInput } from "./auth.schema";

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
