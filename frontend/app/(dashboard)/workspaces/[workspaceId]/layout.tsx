import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { WorkspaceRoleProvider } from "@/lib/workspace-context";
import type { WorkspaceRole } from "@/lib/types";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let role: WorkspaceRole | null = null;

  try {
    const res = await apiFetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}`,
      { token, cookieStore, cache: "no-store" },
    );
    if (res.ok) {
      const json = await res.json();
      role = json.data?.role ?? null;
    }
  } catch {
    // role stays null
  }

  return <WorkspaceRoleProvider role={role}>{children}</WorkspaceRoleProvider>;
}
