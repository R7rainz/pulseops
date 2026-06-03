"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API = "http://127.0.0.1:4000";

export async function acknowledgeIncident(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  const workspaceId = formData.get("workspaceId") as string;
  const incidentId = formData.get("incidentId") as string;

  if (!token) return redirect(`/login?redirect=/workspaces/${workspaceId}/incidents`);

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

    if (res.ok) {
      cookieStore.set("pulseops_toast", JSON.stringify({ message: "Incident acknowledged", type: "success" }), { path: "/", maxAge: 5 });
    } else {
      const errData = await res.json();
      cookieStore.set("pulseops_toast", JSON.stringify({ message: errData.message || "Failed to acknowledge", type: "error" }), { path: "/", maxAge: 5 });
    }
  } catch {
    cookieStore.set("pulseops_toast", JSON.stringify({ message: "Network error", type: "error" }), { path: "/", maxAge: 5 });
  }

  redirect(`/workspaces/${workspaceId}/incidents`);
}

export async function resolveIncident(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  const workspaceId = formData.get("workspaceId") as string;
  const incidentId = formData.get("incidentId") as string;

  if (!token) return redirect(`/login?redirect=/workspaces/${workspaceId}/incidents`);

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

    if (res.ok) {
      cookieStore.set("pulseops_toast", JSON.stringify({ message: "Incident resolved", type: "success" }), { path: "/", maxAge: 5 });
    } else {
      const errData = await res.json();
      cookieStore.set("pulseops_toast", JSON.stringify({ message: errData.message || "Failed to resolve", type: "error" }), { path: "/", maxAge: 5 });
    }
  } catch {
    cookieStore.set("pulseops_toast", JSON.stringify({ message: "Network error", type: "error" }), { path: "/", maxAge: 5 });
  }

  redirect(`/workspaces/${workspaceId}/incidents`);
}
