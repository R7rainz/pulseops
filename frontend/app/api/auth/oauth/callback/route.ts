import { NextResponse } from "next/server";
import { API_URL } from "@/lib/constants";
import { getDestinationPath } from "@/app/(auth)/auth.actions";

const ACCESS_MAX_AGE = 60 * 60 * 24 * 7;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const MFA_MAX_AGE = 60 * 5;

// Landing point after the backend finishes the OAuth dance. The backend stashes
// the freshly minted session behind a single-use handoff `code`; we exchange it
// server-to-server and set the session cookies here (tokens never touch the URL
// beyond the opaque handoff).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const secure = process.env.NODE_ENV === "production";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }

    const { data } = await res.json();

    // The linked account has 2FA enabled — hand off to the challenge page.
    if (data.mfaRequired) {
      const response = NextResponse.redirect(new URL("/2fa", request.url));
      response.cookies.set("pulseops_mfa", data.mfaToken, {
        httpOnly: true,
        secure,
        path: "/",
        maxAge: MFA_MAX_AGE,
      });
      return response;
    }

    const destination = await getDestinationPath(data.accessToken);
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set("pulseops_token", data.accessToken, {
      httpOnly: true,
      secure,
      path: "/",
      maxAge: ACCESS_MAX_AGE,
    });
    response.cookies.set("pulseops_refresh", data.refreshToken, {
      httpOnly: true,
      secure,
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
