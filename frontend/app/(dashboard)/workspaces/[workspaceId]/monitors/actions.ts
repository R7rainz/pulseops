"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

function setToast(cookieStore: Awaited<ReturnType<typeof cookies>>, message: string, type: "success" | "error" | "info" = "success") {
  cookieStore.set("pulseops_toast", JSON.stringify({ message, type }), { path: "/", maxAge: 5 });
}

export async function createMonitor(formData: FormData) {
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const method = (formData.get("method") as string) || undefined;
  const intervalSeconds = formData.get("intervalSeconds")
    ? Number(formData.get("intervalSeconds"))
    : undefined;
  const timeoutMs = formData.get("timeoutMs")
    ? Number(formData.get("timeoutMs"))
    : undefined;
  const expectedStatus = formData.get("expectedStatus")
    ? Number(formData.get("expectedStatus"))
    : undefined;

  if (!name || !url || !workspaceId) return;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) return;

  try {
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
          method,
          intervalSeconds: intervalSeconds || 60,
          timeoutMs: timeoutMs || 5000,
          expectedStatus: expectedStatus || 200,
        }),
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to create monitor", "error");
      return;
    }

    setToast(cookieStore, "Monitor created successfully");
    revalidatePath(`/workspaces/${workspaceId}/monitors`);
  } catch (err) {
    console.error("Network error creating monitor:", err);
  }
}

export async function deleteMonitor(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token || !monitorId || !workspaceId) return;

  try {
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/monitors/${monitorId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to delete monitor", "error");
      return;
    }

    setToast(cookieStore, "Monitor deleted");
  } catch (error) {
    console.error("Network error deleting monitor:", error);
  }

  revalidatePath(`/workspaces/${workspaceId}/monitors`);
}

export async function pauseMonitor(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token || !monitorId || !workspaceId) return;

  try {
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/monitors/${monitorId}/pause`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to pause monitor", "error");
      return;
    }

    setToast(cookieStore, "Monitor paused", "info");
  } catch (error) {
    console.error("Network error pausing monitor:", error);
  }

  revalidatePath(`/workspaces/${workspaceId}/monitors`);
}

export async function resumeMonitor(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token || !monitorId || !workspaceId) return;

  try {
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/monitors/${monitorId}/resume`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to resume monitor", "error");
      return;
    }

    setToast(cookieStore, "Monitor resumed");
  } catch (error) {
    console.error("Network error resuming monitor:", error);
  }

  revalidatePath(`/workspaces/${workspaceId}/monitors`);
}

export async function triggerCheck(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token || !monitorId || !workspaceId) return;

  try {
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/monitors/${monitorId}/check`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      setToast(cookieStore, "Failed to trigger check", "error");
      return;
    }

    setToast(cookieStore, "Check queued for execution", "info");
  } catch (error) {
    console.error("Network error triggering check:", error);
  }

  revalidatePath(`/workspaces/${workspaceId}/monitors`);
}

export async function updateMonitor(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const method = (formData.get("method") as string) || undefined;
  const intervalSeconds = formData.get("intervalSeconds")
    ? Number(formData.get("intervalSeconds"))
    : undefined;
  const timeoutMs = formData.get("timeoutMs")
    ? Number(formData.get("timeoutMs"))
    : undefined;
  const expectedStatus = formData.get("expectedStatus")
    ? Number(formData.get("expectedStatus"))
    : undefined;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token || !monitorId || !workspaceId) return;

  const body: Record<string, unknown> = {};
  if (name) body.name = name;
  if (url) body.url = url;
  if (method) body.method = method;
  if (intervalSeconds) body.intervalSeconds = intervalSeconds;
  if (timeoutMs) body.timeoutMs = timeoutMs;
  if (expectedStatus) body.expectedStatus = expectedStatus;

  try {
    const res = await fetch(`http://127.0.0.1:4000/api/v1/monitors/${monitorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setToast(cookieStore, "Failed to update monitor", "error");
      return;
    }

    setToast(cookieStore, "Monitor updated");
  } catch (error) {
    console.error("Network error updating monitor:", error);
  }

  revalidatePath(`/workspaces/${workspaceId}/monitors`);
}

export async function scheduleMaintenance(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const monitorId = formData.get("monitorId") as string;
  const maintenanceStartAt = formData.get("maintenanceStartAt") as string;
  const maintenanceEndAt = formData.get("maintenanceEndAt") as string;
  const clear = formData.get("clear") === "true";

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token || !monitorId || !workspaceId) return;

  const body: Record<string, unknown> = {};
  if (clear) {
    body.maintenanceStartAt = null;
    body.maintenanceEndAt = null;
  } else {
    if (!maintenanceStartAt || !maintenanceEndAt) {
      setToast(cookieStore, "Both start and end times are required", "error");
      return;
    }
    body.maintenanceStartAt = new Date(maintenanceStartAt).toISOString();
    body.maintenanceEndAt = new Date(maintenanceEndAt).toISOString();
  }

  try {
    const res = await fetch(`http://127.0.0.1:4000/api/v1/monitors/${monitorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setToast(cookieStore, "Failed to schedule maintenance", "error");
      return;
    }

    setToast(cookieStore, clear ? "Maintenance window cleared" : "Maintenance scheduled");
  } catch {
    setToast(cookieStore, "Network error scheduling maintenance", "error");
  }

  revalidatePath(`/workspaces/${workspaceId}/monitors/${monitorId}`);
}
