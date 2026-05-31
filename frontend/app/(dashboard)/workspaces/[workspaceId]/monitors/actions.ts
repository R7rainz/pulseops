"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Trash2 } from "lucide-react"; // We'll need this in the UI later

export async function createMonitor(formData: FormData) {
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  // 1. Grab the dynamic ID from the hidden input
  const workspaceId = formData.get("workspaceId") as string;

  if (!name || !url || !workspaceId) {
    return { error: "Missing required fields." };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) {
    return { error: "Authentication token missing." };
  }

  try {
    // 2. Inject it into the URL!
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          url,
          intervalSeconds: 60,
        }),
      },
    );

    if (!res.ok) {
      return { error: "Backend rejected the request." };
    }

    revalidatePath("/monitors");
    return { success: true };
  } catch (err) {
    return { error: "A network error occurred." };
  }
}

// Add this to the bottom of actions.ts

export async function deleteMonitor(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token || !monitorId || !workspaceId) return { error: "Missing data" };

  try {
    // Note: Your Fastify route is /api/v1/monitors/:monitorId (no workspaceId in the URL)
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/monitors/${monitorId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      console.error("Failed to delete monitor");
    }
  } catch (error) {
    console.error("Network error deleting monitor:", error);
  }

  // Refresh the dashboard so the card disappears!
  revalidatePath(`/workspaces/${workspaceId}/monitors`);
}
