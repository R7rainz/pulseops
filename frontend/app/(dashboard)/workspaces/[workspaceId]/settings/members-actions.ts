"use server";

import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { revalidatePath } from "next/cache";

function setToast(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  message: string,
  type: "success" | "error" | "info" = "success",
) {
  cookieStore.set("pulseops_toast", JSON.stringify({ message, type }), {
    path: "/",
    maxAge: 5,
  });
}

export async function removeMember(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const userId = formData.get("userId") as string;

  if (!workspaceId || !userId) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return;

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/members/${userId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      const err = await res.json();
      setToast(cookieStore, err.message || "Failed to remove member", "error");
      return;
    }

    setToast(cookieStore, "Member removed");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
  } catch {
    setToast(cookieStore, "Network error removing member", "error");
  }
}

export async function updateMemberRole(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!workspaceId || !userId || !role) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return;

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/members/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      setToast(cookieStore, err.message || "Failed to update role", "error");
      return;
    }

    setToast(cookieStore, "Member role updated");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
  } catch {
    setToast(cookieStore, "Network error updating role", "error");
  }
}
