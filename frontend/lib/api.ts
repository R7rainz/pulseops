import { API_URL } from "@/lib/constants";
const API_BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || "Request failed");
  }

  const body = await res.json();
  return body.data as T;
}

export function apiGet<T>(path: string, token: string) {
  return request<T>(path, token);
}

export function apiPost<T>(
  path: string,
  token: string,
  body?: unknown,
) {
  return request<T>(path, token, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(
  path: string,
  token: string,
  body: unknown,
) {
  return request<T>(path, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string, token: string) {
  return request<T>(path, token, {
    method: "DELETE",
  });
}
