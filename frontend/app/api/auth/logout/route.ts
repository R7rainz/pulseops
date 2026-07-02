import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("pulseops_token")

  // Allow an internal redirect target (e.g. clearing an expired session when
  // someone just wants the landing page). Only same-origin relative paths are
  // honoured to avoid open redirects; anything else falls back to /login.
  const param = new URL(request.url).searchParams.get("redirect");
  const target = param && param.startsWith("/") && !param.startsWith("//") ? param : "/login";
  return NextResponse.redirect(new URL(target, request.url))
}
