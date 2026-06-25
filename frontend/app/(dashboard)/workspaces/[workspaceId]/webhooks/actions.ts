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

export async function createWebhook(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const url = formData.get("url") as string;
  const name = formData.get("name") as string;
  const eventsRaw = formData.getAll("events") as string[];

  if (!url) return { error: "Target URL is required" };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/webhooks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          name: name || undefined,
          events: eventsRaw.length > 0 ? eventsRaw : undefined,
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      return { error: err.message || "Failed to create webhook" };
    }

    setToast(cookieStore, "Webhook endpoint created");
    revalidatePath(`/workspaces/${workspaceId}/webhooks`);
    return { success: true };
  } catch {
    return { error: "Network error creating webhook" };
  }
}

export async function updateWebhook(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const webhookId = formData.get("webhookId") as string;
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const eventsRaw = formData.getAll("events") as string[];

  if (!webhookId) return { error: "Missing webhook ID" };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  const body: Record<string, unknown> = {};
  if (name) body.name = name;
  if (url) body.url = url;
  if (eventsRaw.length > 0) body.events = eventsRaw;

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return { error: err.message || "Failed to update webhook" };
    }

    setToast(cookieStore, "Webhook updated");
    revalidatePath(`/workspaces/${workspaceId}/webhooks`);
    return { success: true };
  } catch {
    return { error: "Network error updating webhook" };
  }
}

export async function deleteWebhook(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const webhookId = formData.get("webhookId") as string;

  if (!webhookId || !workspaceId) return { error: "Missing parameters" };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      return { error: err.message || "Failed to delete webhook" };
    }

    setToast(cookieStore, "Webhook deleted");
    revalidatePath(`/workspaces/${workspaceId}/webhooks`);
    return { success: true };
  } catch {
    return { error: "Network error deleting webhook" };
  }
}

export async function toggleWebhook(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const webhookId = formData.get("webhookId") as string;

  if (!webhookId) return { error: "Missing webhook ID" };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/toggle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      return { error: err.message || "Failed to toggle webhook" };
    }

    revalidatePath(`/workspaces/${workspaceId}/webhooks`);
    return { success: true };
  } catch {
    return { error: "Network error toggling webhook" };
  }
}

export async function testWebhook(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const webhookId = formData.get("webhookId") as string;

  if (!webhookId) return { error: "Missing webhook ID" };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.message || "Test ping failed" };
    }

    setToast(cookieStore, "Test ping sent successfully");
    revalidatePath(`/workspaces/${workspaceId}/webhooks`);
    return { success: true };
  } catch {
    return { error: "Network error testing webhook" };
  }
}
