"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthState = {
  error?: string;
};

// 🚨 NEW HELPER: Determines where the user should go after logging in
async function getDestinationPath(token: string) {
  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.ok) {
      const workspacesData = await res.json();
      const workspacesList = workspacesData.data || [];

      // If they own a workspace, send them straight to its dashboard
      if (workspacesList.length > 0) {
        return `/workspaces/${workspacesList[0].id}/monitors`;
      }
    }
  } catch (error) {
    console.error("Failed to fetch workspaces during auth:", error);
  }

  // Fallback: If they have no workspaces (or it failed), send them to onboarding
  return "/workspaces/new";
}

export async function loginUser(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const inviteToken = formData.get("invite_token") as string | null;

  if (!email || !password) return { error: "Email and password are required." };

  let destination = "/workspaces/new"; // Default fallback

  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.message || "Invalid email or password." };
    }

    const rawData = await res.json();
    const token = rawData.data.accessToken;

    const cookieStore = await cookies();
    cookieStore.set("pulseops_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    if (inviteToken) {
      const acceptRes = await fetch(
        `http://127.0.0.1:4000/api/v1/invites/${inviteToken}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (acceptRes.ok) {
        const acceptData = await acceptRes.json();
        destination = `/workspaces/${acceptData.data.workspaceId}/monitors`;
      }
    } else {
      destination = await getDestinationPath(token);
    }
  } catch (err) {
    return { error: "Network error connecting to the server." };
  }

  // 🚨 REDIRECT MUST BE OUTSIDE TRY/CATCH
  redirect(destination);
}

export async function signupUser(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const inviteToken = formData.get("invite_token") as string | null;

  if (!name || !email || !password)
    return { error: "All fields are required." };

  let destination = "/workspaces/new";

  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        error:
          errorData.message || "Failed to create account. Email may be taken.",
      };
    }

    const rawData = await res.json();
    const token = rawData.data.accessToken;

    const cookieStore = await cookies();
    cookieStore.set("pulseops_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Auto-accept invite if token present
    if (inviteToken) {
      const acceptRes = await fetch(
        `http://127.0.0.1:4000/api/v1/invites/${inviteToken}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (acceptRes.ok) {
        const acceptData = await acceptRes.json();
        destination = `/workspaces/${acceptData.data.workspaceId}/monitors`;
      }
    } else {
      destination = await getDestinationPath(token);
    }
  } catch (err) {
    return { error: "Network error connecting to the server." };
  }

  // 🚨 REDIRECT MUST BE OUTSIDE TRY/CATCH
  redirect(destination);
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("pulseops_token");
  redirect("/login");
}
