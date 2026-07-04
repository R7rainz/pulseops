import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("pulseops_token")?.value;
  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password") ||
    pathname.startsWith("/magic-link") || pathname.startsWith("/2fa");
  // 🚨 Now protecting the new workspaces route!
  const isDashboardRoute = pathname.startsWith("/workspaces");

  if (!token && isDashboardRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    // 🚨 Send them to the Root Router, NOT /monitors
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 🚨 Ensure the matcher runs on the root, auth, and workspaces
  matcher: ["/", "/workspaces/:path*", "/login", "/signup", "/forgot-password", "/reset-password", "/magic-link", "/2fa"],
};
