import { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

async function refreshToken(
  token: string,
  cookieStore: CookieStore,
): Promise<string | null> {
  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newToken = data.data?.accessToken as string | undefined;
    if (!newToken) return null;

    cookieStore.set("pulseops_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return newToken;
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

  const newToken = await refreshToken(token, cookieStore);
  if (!newToken) {
    cookieStore.delete("pulseops_token");
    return res;
  }

  headers.Authorization = `Bearer ${newToken}`;
  return fetch(url, { ...fetchOptions, headers });
}
