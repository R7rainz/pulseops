"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { API_URL } from "@/lib/constants";

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

// Saves the whole page config in one call — the API replaces the published
// monitor set wholesale, so the form always submits the complete selection.
export async function saveStatusPage(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const slug = ((formData.get("slug") as string) || "").trim();
  const title = ((formData.get("title") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const isPublic = formData.get("isPublic") === "on";

  // Checked monitors, each with an optional public display name.
  const selected = formData.getAll("monitorIds").map(String);
  const monitors = selected.map((id) => {
    const alias = ((formData.get(`alias-${id}`) as string) || "").trim();
    return { monitorId: Number(id), ...(alias ? { displayName: alias } : {}) };
  });

  if (!workspaceId || !slug || !title) {
    return { error: "Slug and title are required" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/status-page`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slug,
        title,
        description: description || null,
        isPublic,
        monitors,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.message || "Failed to save status page";
      setToast(cookieStore, message, "error");
      return { error: message };
    }

    setToast(cookieStore, isPublic ? "Status page published" : "Status page saved (not public)");
    revalidatePath(`/workspaces/${workspaceId}/status`);
    return { success: true };
  } catch {
    setToast(cookieStore, "Network error saving status page", "error");
    return { error: "Network error saving status page" };
  }
}

export async function unpublishStatusPage(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/status-page`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setToast(cookieStore, "Failed to take the page offline", "error");
      return { error: "Failed to take the page offline" };
    }

    setToast(cookieStore, "Status page taken offline");
    revalidatePath(`/workspaces/${workspaceId}/status`);
    return { success: true };
  } catch {
    return { error: "Network error" };
  }
}
