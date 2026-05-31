import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get("pulseops_token")?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith("/login");

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/monitors", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/monitors/:path*", "/webhooks/:path*", "/login"],
};
