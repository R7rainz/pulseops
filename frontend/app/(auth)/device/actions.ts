"use server";

import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";

export type ApproveState = { error?: string; success?: boolean };

/** Approves a CLI/TUI device code on behalf of the signed-in user. */
export async function approveDevice(
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  const userCode = ((formData.get("userCode") as string) || "").trim();
  if (!userCode) return { error: "Enter the code shown in your terminal." };

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return { error: "Your session expired — please sign in again." };

  try {
    const res = await apiFetch(`${API_URL}/api/v1/auth/device/approve`, {
      method: "POST",
      body: JSON.stringify({ userCode }),
      token,
      cookieStore,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.message || "That code is invalid or has expired." };
    }
    return { success: true };
  } catch {
    return { error: "Network error contacting the server." };
  }
}
