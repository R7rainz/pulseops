"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/constants";

export type AuthState = {
  error?: string;
};

type SessionTokens = { accessToken: string; refreshToken: string };
type LoginData =
  | ({ mfaRequired?: false } & SessionTokens & { user?: unknown })
  | { mfaRequired: true; mfaToken: string };

const ACCESS_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (JWT itself expires in 15m; refreshed on demand)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MFA_MAX_AGE = 60 * 5; // 5 minutes to complete the second factor

/**
 * Persist the access + refresh tokens returned by the backend as httpOnly
 * cookies. Both are httpOnly so client JS can never read them; the access token
 * is surfaced to client components via the /api/auth/token bridge when needed.
 */
export async function setSessionCookies(tokens: SessionTokens) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set("pulseops_token", tokens.accessToken, {
    httpOnly: true,
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  cookieStore.set("pulseops_refresh", tokens.refreshToken, {
    httpOnly: true,
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

async function setMfaChallengeCookie(mfaToken: string) {
  const cookieStore = await cookies();
  cookieStore.set("pulseops_mfa", mfaToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MFA_MAX_AGE,
  });
}

// Determines where the user should go after a completed sign-in.
export async function getDestinationPath(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/workspaces`, {
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

function safeCallback(callbackUrl: string | null): string | null {
  if (!callbackUrl) return null;
  return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : null;
}

export async function loginUser(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const inviteToken = formData.get("invite_token") as string | null;
  const callbackUrl = formData.get("callbackUrl") as string | null;

  if (!email || !password) return { error: "Email and password are required." };

  let destination = "/workspaces/new";

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.message || "Invalid email or password." };
    }

    const data = (await res.json()).data as LoginData;

    // 2FA challenge — stash the short-lived MFA token and send the user to the
    // second-factor page, preserving where they were headed.
    if (data.mfaRequired) {
      await setMfaChallengeCookie(data.mfaToken);
      const params = new URLSearchParams();
      if (callbackUrl) params.set("callbackUrl", callbackUrl);
      if (inviteToken) params.set("invite_token", inviteToken);
      const qs = params.toString();
      redirect(`/2fa${qs ? `?${qs}` : ""}`);
    }

    await setSessionCookies(data);
    destination =
      safeCallback(callbackUrl) ??
      (inviteToken ? `/invite/${inviteToken}` : await getDestinationPath(data.accessToken));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Network error connecting to the server." };
  }

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
    const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
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

    const data = (await res.json()).data as SessionTokens;
    await setSessionCookies(data);

    if (inviteToken) {
      destination = `/invite/${inviteToken}`;
    } else {
      destination = await getDestinationPath(data.accessToken);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Network error connecting to the server." };
  }

  redirect(destination);
}

// Completes a TOTP second factor. Reads the short-lived challenge token from
// the httpOnly cookie set during login, exchanges it + the code for a session.
export async function verify2fa(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const code = formData.get("code") as string;
  const callbackUrl = formData.get("callbackUrl") as string | null;
  const inviteToken = formData.get("invite_token") as string | null;

  if (!code) return { error: "Enter your verification code." };

  const cookieStore = await cookies();
  const mfaToken = cookieStore.get("pulseops_mfa")?.value;
  if (!mfaToken) {
    return { error: "Your verification session expired. Please sign in again." };
  }

  let destination = "/workspaces/new";

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken, code }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.message || "Invalid verification code." };
    }

    const data = (await res.json()).data as SessionTokens;
    await setSessionCookies(data);
    cookieStore.delete("pulseops_mfa");

    destination =
      safeCallback(callbackUrl) ??
      (inviteToken ? `/invite/${inviteToken}` : await getDestinationPath(data.accessToken));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Network error connecting to the server." };
  }

  redirect(destination);
}

// Consumes a magic-link token and signs the user in (or hands off to 2FA).
export async function verifyMagicLink(token: string): Promise<AuthState> {
  if (!token) return { error: "Invalid sign-in link." };

  let destination = "/workspaces/new";

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/magic-link/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.message || "This sign-in link is invalid or has expired." };
    }

    const data = (await res.json()).data as LoginData;

    if (data.mfaRequired) {
      await setMfaChallengeCookie(data.mfaToken);
      redirect("/2fa");
    }

    await setSessionCookies(data);
    destination = await getDestinationPath(data.accessToken);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Network error connecting to the server." };
  }

  redirect(destination);
}

export async function logoutUser() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("pulseops_refresh")?.value;

  // Best-effort server-side revocation so the session can't be refreshed again.
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore — we still clear the cookies below.
    }
  }

  cookieStore.delete("pulseops_token");
  cookieStore.delete("pulseops_refresh");
  redirect("/login");
}

// next/navigation's redirect() throws a control-flow error we must re-throw
// rather than swallow in the surrounding try/catch.
function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
