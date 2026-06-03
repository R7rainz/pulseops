"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API = "http://127.0.0.1:4000";

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

export async function acknowledgeIncident(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  const workspaceId = formData.get("workspaceId") as string;
  const incidentId = formData.get("incidentId") as string;

  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(
      `${API}/api/v1/incidents/${incidentId}/acknowledge`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      const errData = await res.json();
      return { error: errData.message || "Failed to acknowledge incident" };
    }

    setToast(cookieStore, "Incident acknowledged");
    revalidatePath(`/workspaces/${workspaceId}/incidents`);
    return { success: true };
  } catch (err) {
    setToast(cookieStore, "Network error acknowledging incident", "error");
    return { error: "Network connection failure" };
  }
}

export async function resolveIncident(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  const workspaceId = formData.get("workspaceId") as string;
  const incidentId = formData.get("incidentId") as string;

  if (!token) return { error: "Unauthenticated" };

  try {
    const res = await fetch(
      `${API}/api/v1/incidents/${incidentId}/resolve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      const errData = await res.json();
      return { error: errData.message || "Failed to resolve incident" };
    }

    setToast(cookieStore, "Incident resolved");
    revalidatePath(`/workspaces/${workspaceId}/incidents`);
    return { success: true };
  } catch (err) {
    setToast(cookieStore, "Network error resolving incident", "error");
    return { error: "Network connection failure" };
  }
}
