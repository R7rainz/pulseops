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

export async function updateWorkspaceName(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;

  if (!name || !workspaceId) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return;

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to update workspace", "error");
      return;
    }

    setToast(cookieStore, "Workspace updated");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
  } catch {
    setToast(cookieStore, "Network error updating workspace", "error");
  }
}

export async function createApiKey(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const scope = formData.get("scope") === "READ_WRITE" ? "READ_WRITE" : "READ_ONLY";

  if (!name || !workspaceId) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return;

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/api-keys`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, scope }),
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to create API key", "error");
      return;
    }

    const data = await res.json();
    const key = data.data;

    setToast(cookieStore, "API key created — copy it now, it won't be shown again", "success");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { key: key.key };
  } catch {
    setToast(cookieStore, "Network error creating API key", "error");
  }
}

export async function createWebhook(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const url = formData.get("url") as string;

  if (!url || !workspaceId) return {
    error: "Target URL is required",
  };

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
        body: JSON.stringify({ url }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      setToast(cookieStore, err.message || "Failed to provision endpoint", "error");
      return { error: err.message || "Failed to provision endpoint" };
    }

    setToast(cookieStore, "Endpoint provisioned");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { success: true };
  } catch {
    setToast(cookieStore, "Network error provisioning endpoint", "error");
    return { error: "Network anomaly during endpoint provisioning" };
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
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      const err = await res.json();
      setToast(cookieStore, err.message || "Failed to purge endpoint", "error");
      return { error: err.message || "Failed to purge endpoint" };
    }

    setToast(cookieStore, "Endpoint purged");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { success: true };
  } catch {
    setToast(cookieStore, "Network error purging endpoint", "error");
    return { error: "Network anomaly during endpoint purge" };
  }
}

export async function revokeApiKey(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const keyId = formData.get("keyId") as string;

  if (!keyId || !workspaceId) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return;

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/api-keys/${keyId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to revoke API key", "error");
      return;
    }

    setToast(cookieStore, "API key revoked");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
  } catch {
    setToast(cookieStore, "Network error revoking API key", "error");
  }
}

// ---------------------------------------------------------------------------
// Alert channels
//
// Config is per-type (see the backend's notification.schema.ts): EMAIL {to},
// SLACK/DISCORD {webhookUrl}, PAGERDUTY {routingKey}, WEBHOOK {url, secret}.
// The server never returns the secret values back, so an edit that leaves the
// secret field blank keeps the stored one.
// ---------------------------------------------------------------------------

function channelConfigFromForm(type: string, formData: FormData) {
  switch (type) {
    case "EMAIL":
      return { to: (formData.get("to") as string)?.trim() };
    case "SLACK":
    case "DISCORD":
      return { webhookUrl: (formData.get("webhookUrl") as string)?.trim() };
    case "PAGERDUTY":
      return { routingKey: (formData.get("routingKey") as string)?.trim() };
    case "WEBHOOK":
      return {
        url: (formData.get("url") as string)?.trim(),
        secret: ((formData.get("secret") as string) || "").trim() || undefined,
      };
    default:
      return {};
  }
}

export async function createChannel(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const type = formData.get("type") as string;
  const name = formData.get("name") as string;
  const events = formData.getAll("events") as string[];

  if (!workspaceId || !type || !name) {
    return { error: "Name and type are required" };
  }
  if (events.length === 0) {
    return { error: "Select at least one event" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        type,
        events,
        config: channelConfigFromForm(type, formData),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.message || "Failed to create channel";
      setToast(cookieStore, message, "error");
      return { error: message };
    }

    setToast(cookieStore, "Alert channel created");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { success: true };
  } catch {
    setToast(cookieStore, "Network error creating channel", "error");
    return { error: "Network error creating channel" };
  }
}

export async function deleteChannel(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const channelId = formData.get("channelId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/channels/${channelId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to delete channel", "error");
      return { error: "Failed to delete channel" };
    }

    setToast(cookieStore, "Channel deleted");
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { success: true };
  } catch {
    setToast(cookieStore, "Network error deleting channel", "error");
    return { error: "Network error deleting channel" };
  }
}

export async function toggleChannel(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const channelId = formData.get("channelId") as string;
  const isActive = formData.get("isActive") === "true";

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/channels/${channelId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to update channel", "error");
      return { error: "Failed to update channel" };
    }

    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { success: true };
  } catch {
    return { error: "Network error updating channel" };
  }
}

// Sends a real alert to the channel. The API answers 200 with { ok: false }
// when the provider rejected it, so the user sees the provider's own error
// rather than a generic failure.
export async function testChannel(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const channelId = formData.get("channelId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/channels/${channelId}/test`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    );

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body.message || "Test failed";
      setToast(cookieStore, message, "error");
      return { error: message };
    }

    if (body.data?.ok) {
      setToast(cookieStore, "Test alert delivered");
      revalidatePath(`/workspaces/${workspaceId}/settings`);
      return { success: true };
    }

    const detail = body.data?.detail || "Delivery failed";
    setToast(cookieStore, `Test failed: ${detail}`, "error");
    return { error: detail };
  } catch {
    setToast(cookieStore, "Network error sending test", "error");
    return { error: "Network error sending test" };
  }
}
