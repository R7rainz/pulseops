import { API_URL } from "@/lib/constants";

type CookieStore = Awaited<ReturnType<typeof import("next/headers").cookies>>;

type RefreshedTokens = { accessToken: string; refreshToken: string } | null;

async function refreshSession(cookieStore: CookieStore): Promise<string | null> {
  const refreshToken = cookieStore.get("pulseops_refresh")?.value;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const tokens = (data.data as RefreshedTokens) ?? null;
    if (!tokens?.accessToken) return null;

    // Persist the fresh access token so subsequent requests reuse it. This
    // succeeds in Server Action / Route Handler contexts and throws in a
    // Server Component render — in which case we still return the new token for
    // the immediate retry, and the (unrotated) refresh token stays valid.
    try {
      cookieStore.set("pulseops_token", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch {
      // Read-only cookie context — ignore.
    }

    return tokens.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch(
  url: string,
  options: RequestInit & { token: string; cookieStore: CookieStore },
): Promise<Response> {
  const { token, cookieStore, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  if (res.status !== 401 && res.status !== 403) return res;

  const newToken = await refreshSession(cookieStore);
  if (!newToken) return res;

  headers.Authorization = `Bearer ${newToken}`;
  return fetch(url, { ...fetchOptions, headers });
}
