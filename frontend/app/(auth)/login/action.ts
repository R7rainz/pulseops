"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let success = false;

  try {
    // 1. Hit your Fastify backend
    const res = await fetch("http://localhost:4000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.message || "Invalid credentials." };
    }

    // 2. Grab the token and set a secure cookie
    const token = json.data.accessToken;
    const cookieStore = await cookies(); // Next.js 15 requires awaiting cookies()

    cookieStore.set("pulseops_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only require HTTPS in prod
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    success = true;
  } catch (error) {
    console.error("Login failed:", error);
    return { error: "Network error. Is the Fastify server running?" };
  }

  // 3. Redirect outside the try/catch block
  if (success) {
    redirect("/monitors");
  }
}
