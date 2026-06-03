type CookieStore = Awaited<ReturnType<typeof import("next/headers").cookies>>;

async function refreshToken(token: string): Promise<string | null> {
  try {
    const res = await fetch("http://127.0.0.1:4000/api/v1/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return (data.data?.accessToken as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch(
  url: string,
  options: RequestInit & { token: string; cookieStore: CookieStore },
): Promise<Response> {
  const { token, cookieStore: _, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  if (res.status !== 401 && res.status !== 403) return res;

  const newToken = await refreshToken(token);
  if (!newToken) return res;

  headers.Authorization = `Bearer ${newToken}`;
  return fetch(url, { ...fetchOptions, headers });
}
