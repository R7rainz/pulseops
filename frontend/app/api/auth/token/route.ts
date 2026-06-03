import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  return NextResponse.json({ token: token || null });
}
