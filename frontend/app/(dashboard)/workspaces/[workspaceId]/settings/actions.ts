"use server";

import { cookies } from "next/headers";
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
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}`,
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

  if (!name || !workspaceId) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return;

  try {
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/api-keys`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
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
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/webhooks`,
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
      `http://127.0.0.1:4000/api/v1/webhooks/${webhookId}`,
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
      `http://127.0.0.1:4000/api/v1/workspaces/api-keys/${keyId}`,
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
