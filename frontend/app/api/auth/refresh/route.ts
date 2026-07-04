import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/constants";

// Client-callable refresh: reads the httpOnly refresh cookie, asks the backend
// for a new access token, and writes it back to the cookie. Used by client
// components that need a valid bearer token (via /api/auth/token) after the
// 15-minute access token has expired.
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("pulseops_refresh")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      const response = NextResponse.json({ error: "Refresh failed" }, { status: 401 });
      response.cookies.delete("pulseops_token");
      response.cookies.delete("pulseops_refresh");
      return response;
    }

    const { data } = await res.json();
    const secure = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ token: data.accessToken });
    response.cookies.set("pulseops_token", data.accessToken, {
      httpOnly: true,
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set("pulseops_refresh", data.refreshToken, {
      httpOnly: true,
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
