/** Resolves connection + auth settings from flags, env, stored login, defaults. */

import { loadCredentials } from "./credentials.js";

export type Auth =
  | { mode: "key"; apiKey: string }
  | { mode: "session"; accessToken: string; refreshToken: string };

export interface Config {
  apiUrl: string;
  auth: Auth;
  workspaceId?: number;
  /** True when auth came from stored `pulseops login` credentials. */
  fromStoredSession: boolean;
}

export interface ConfigOverrides {
  url?: string;
  apiKey?: string;
  workspace?: string;
}

const DEFAULT_API_URL = "http://localhost:4000";

export class ConfigError extends Error {}

/**
 * Auth precedence: explicit `--api-key`/`PULSEOPS_API_KEY` (key mode) wins;
 * otherwise a stored `pulseops login` session is used. URL/workspace each
 * resolve flag > env > stored > default.
 */
export function resolveConfig(overrides: ConfigOverrides): Config {
  const stored = loadCredentials();

  const apiUrl = (
    overrides.url ||
    process.env.PULSEOPS_API_URL ||
    stored?.apiUrl ||
    DEFAULT_API_URL
  ).replace(/\/+$/, "");

  const apiKey = overrides.apiKey || process.env.PULSEOPS_API_KEY || "";

  let auth: Auth;
  let fromStoredSession = false;
  if (apiKey) {
    auth = { mode: "key", apiKey };
  } else if (stored) {
    auth = {
      mode: "session",
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
    };
    fromStoredSession = true;
  } else {
    throw new ConfigError(
      "Not authenticated. Run `pulseops login`, or pass --api-key / set " +
        "PULSEOPS_API_KEY.",
    );
  }

  // Workspace: flag > env > stored default (session only).
  const rawWorkspace = overrides.workspace ?? process.env.PULSEOPS_WORKSPACE;
  let workspaceId: number | undefined;
  if (rawWorkspace != null && rawWorkspace !== "") {
    workspaceId = Number(rawWorkspace);
    if (!Number.isInteger(workspaceId)) {
      throw new ConfigError(`Invalid workspace id: ${rawWorkspace}`);
    }
  } else if (fromStoredSession && stored?.workspaceId != null) {
    workspaceId = stored.workspaceId;
  }

  return { apiUrl, auth, workspaceId, fromStoredSession };
}

/**
 * Asserts the current auth can perform writes. v1 API keys are read-only, so
 * mutations (create/update monitors, ack/resolve incidents) need a signed-in
 * session from `pulseops login`.
 */
export function assertWritable(config: Config): void {
  if (config.auth.mode === "key") {
    throw new ConfigError(
      "This action needs a signed-in session — API keys are read-only. " +
        "Run `pulseops login` (writes also require an OWNER/ADMIN role).",
    );
  }
}

/** Asserts a workspace id is present for workspace-scoped commands. */
export function requireWorkspace(config: Config): number {
  if (config.workspaceId == null) {
    const hint =
      config.auth.mode === "session"
        ? "Pick one with `pulseops use <id>` (see `pulseops workspaces`)."
        : "Pass --workspace <id> or set PULSEOPS_WORKSPACE.";
    throw new ConfigError(`This command needs a workspace. ${hint}`);
  }
  return config.workspaceId;
}
