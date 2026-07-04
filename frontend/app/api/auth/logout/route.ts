import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/constants";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("pulseops_refresh")?.value;

  // Revoke the session server-side so the refresh token can't be reused.
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore — we still clear the cookies below.
    }
  }

  cookieStore.delete("pulseops_token");
  cookieStore.delete("pulseops_refresh");

  // Allow an internal redirect target (e.g. clearing an expired session when
  // someone just wants the landing page). Only same-origin relative paths are
  // honoured to avoid open redirects; anything else falls back to /login.
  const param = new URL(request.url).searchParams.get("redirect");
  const target = param && param.startsWith("/") && !param.startsWith("//") ? param : "/login";
  return NextResponse.redirect(new URL(target, request.url));
}
