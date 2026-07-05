import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Persisted login state, written by `pulseops login` to
 * `~/.config/pulseops/credentials.json` (mode 0600). Absent until the user
 * logs in; API-key usage never touches this file.
 */
export interface Credentials {
  apiUrl: string;
  accessToken: string;
  refreshToken: string;
  user?: { id: number; name: string | null; email: string };
  /** Default workspace chosen at login or via `pulseops use`. */
  workspaceId?: number;
}

function configDir(): string {
  if (process.env.PULSEOPS_CONFIG_DIR) return process.env.PULSEOPS_CONFIG_DIR;
  const base =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "pulseops");
}

export function credentialsPath(): string {
  return path.join(configDir(), "credentials.json");
}

export function loadCredentials(): Credentials | null {
  try {
    const raw = fs.readFileSync(credentialsPath(), "utf8");
    const parsed = JSON.parse(raw) as Credentials;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = credentialsPath();
  fs.writeFileSync(file, JSON.stringify(creds, null, 2) + "\n", { mode: 0o600 });
  // writeFile's mode is ignored if the file already existed — enforce it.
  fs.chmodSync(file, 0o600);
}

/** Merge a partial update into the stored credentials (no-op if not logged in). */
export function updateCredentials(patch: Partial<Credentials>): Credentials | null {
  const current = loadCredentials();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveCredentials(next);
  return next;
}

export function clearCredentials(): void {
  try {
    fs.unlinkSync(credentialsPath());
  } catch {
    // already gone
  }
}
