import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("pulseops_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/live`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Backend error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
