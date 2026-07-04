"use server";

import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";

export async function createWorkspace(prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name) return { error: "Workspace name is required." };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) return { error: "Authentication required." };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) return { error: "Failed to create workspace." };

    const data = await res.json();
    const ws = data.data || data;
    const id = ws.id || ws.workspaceId;

    if (id) redirect(`/workspaces/${id}/monitors`);
    return { error: "Workspace created but redirect failed." };
  } catch {
    return { error: "Network error creating workspace." };
  }
}

export async function deleteWorkspace(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token || !workspaceId) return { success: false };

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) return { success: false };

    cookieStore.set("pulseops_toast", JSON.stringify({ message: "Workspace deleted", type: "success" }), { path: "/", maxAge: 5 });
    return { success: true };
  } catch (error) {
    console.error("Network error deleting workspace:", error);
    return { success: false };
  }
}
