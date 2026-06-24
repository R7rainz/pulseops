"use server";

import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";

function setToast(cookieStore: Awaited<ReturnType<typeof cookies>>, message: string, type: "success" | "error") {
  cookieStore.set(
    "pulseops_toast",
    JSON.stringify({ message, type }),
    { path: "/", maxAge: 5 },
  );
}

export async function updateProfile(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return redirect("/login");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  const body: Record<string, string> = {};
  if (name) body.name = name;
  if (email) body.email = email;

  if (Object.keys(body).length === 0) {
    setToast(cookieStore, "No fields to update.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json();
      setToast(cookieStore, json.message || "Failed to update profile.", "error");
      return;
    }

    setToast(cookieStore, "Profile updated", "success");
  } catch {
    setToast(cookieStore, "Network error updating profile.", "error");
  }
}

export async function changePassword(
  prevState: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Not authenticated" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "Both current and new password are required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const json = await res.json();
      return { error: json.message || "Failed to change password." };
    }

    return { success: "Password changed successfully" };
  } catch {
    return { error: "Network error changing password." };
  }
}
