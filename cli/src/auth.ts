import { spawn } from "node:child_process";
import { ApiError } from "./client.js";
import type { SessionUser } from "./types.js";

const API_PREFIX = "/api/v1";

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export type DevicePollResult =
  | { status: "pending" }
  | { status: "expired" }
  | ({ status: "authorized"; user: SessionUser | null } & SessionTokens);

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** Step 1: start a device authorization (no auth). */
export async function deviceAuthorize(apiUrl: string): Promise<DeviceAuthorization> {
  const res = await fetch(`${apiUrl}${API_PREFIX}/auth/device/authorize`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const body = await parse(res);
  if (!res.ok) throw new ApiError(res.status, body.message || "Failed to start login");
  return body.data as DeviceAuthorization;
}

/** Step 3: poll for the session. Returns pending/expired/authorized. */
export async function devicePoll(
  apiUrl: string,
  deviceCode: string,
): Promise<DevicePollResult> {
  const res = await fetch(`${apiUrl}${API_PREFIX}/auth/device/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ deviceCode }),
  });
  const body = await parse(res);
  if (res.ok) {
    const data = body.data ?? {};
    if (data.status === "authorized") {
      return {
        status: "authorized",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user ?? null,
      };
    }
    return { status: "pending" };
  }
  if (body.error === "expired_token") return { status: "expired" };
  throw new ApiError(res.status, body.message || "Login failed");
}

/** Exchange a refresh token for a fresh access token (tokens returned in body). */
export async function refreshSession(
  apiUrl: string,
  refreshToken: string,
): Promise<SessionTokens> {
  const res = await fetch(`${apiUrl}${API_PREFIX}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await parse(res);
  if (!res.ok) throw new ApiError(res.status, body.message || "Session refresh failed");
  const data = body.data ?? {};
  return {
    accessToken: data.accessToken,
    // Refresh tokens aren't rotated server-side; keep the current one if absent.
    refreshToken: data.refreshToken ?? refreshToken,
  };
}

/** Best-effort open of a URL in the user's default browser. */
export function openBrowser(url: string): void {
  const platform = process.platform;
  const [cmd, args] =
    platform === "darwin"
      ? ["open", [url]]
      : platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(cmd, args as string[], { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // No browser available (headless) — the user can open the URL manually.
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
