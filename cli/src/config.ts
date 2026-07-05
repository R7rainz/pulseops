/** Resolves connection settings from CLI flags, then env, then defaults. */

export interface Config {
  apiUrl: string;
  apiKey: string;
  workspaceId?: number;
}

export interface ConfigOverrides {
  url?: string;
  apiKey?: string;
  workspace?: string;
}

const DEFAULT_API_URL = "http://localhost:4000";

export class ConfigError extends Error {}

/**
 * Precedence: explicit flag > environment variable > built-in default.
 *   --url       / PULSEOPS_API_URL   (default http://localhost:4000)
 *   --api-key   / PULSEOPS_API_KEY   (required)
 *   --workspace / PULSEOPS_WORKSPACE (required only for workspace-scoped calls)
 */
export function resolveConfig(overrides: ConfigOverrides): Config {
  const apiUrl = (
    overrides.url ||
    process.env.PULSEOPS_API_URL ||
    DEFAULT_API_URL
  ).replace(/\/+$/, "");

  const apiKey = overrides.apiKey || process.env.PULSEOPS_API_KEY || "";
  if (!apiKey) {
    throw new ConfigError(
      "No API key. Pass --api-key po_… or set PULSEOPS_API_KEY " +
        "(create a key in Settings → API Keys).",
    );
  }

  const rawWorkspace = overrides.workspace ?? process.env.PULSEOPS_WORKSPACE;
  let workspaceId: number | undefined;
  if (rawWorkspace != null && rawWorkspace !== "") {
    workspaceId = Number(rawWorkspace);
    if (!Number.isInteger(workspaceId)) {
      throw new ConfigError(`Invalid workspace id: ${rawWorkspace}`);
    }
  }

  return { apiUrl, apiKey, workspaceId };
}

/** Asserts a workspace id is present for workspace-scoped commands. */
export function requireWorkspace(config: Config): number {
  if (config.workspaceId == null) {
    throw new ConfigError(
      "This command needs a workspace. Pass --workspace <id> or set " +
        "PULSEOPS_WORKSPACE.",
    );
  }
  return config.workspaceId;
}
