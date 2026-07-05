import type { Auth, Config } from "./config.js";
import type {
  Envelope,
  Incident,
  IncidentWithMonitor,
  LiveMonitors,
  Monitor,
  MonitorAnalytics,
  MonitorCheck,
  MonitorStats,
  ChecksMeta,
  SessionUser,
  Workspace,
} from "./types.js";

const API_PREFIX = "/api/v1";

/** Thrown for any non-2xx response; carries the HTTP status and server message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PagedResult<T> {
  data: T;
  meta: ChecksMeta;
}

/** Notified when session tokens are refreshed, so callers can persist them. */
export type OnTokensRefreshed = (tokens: {
  accessToken: string;
  refreshToken: string;
}) => void;

/**
 * Thin typed client over the PulseOps read API. Authenticates with either a
 * workspace API key (`x-api-key`) or a user session (`Authorization: Bearer`),
 * per the config. In session mode it transparently refreshes the access token
 * once on a 401 and replays the request. Paths mirror the OpenAPI spec.
 */
export class PulseOpsClient {
  private readonly apiUrl: string;
  private readonly baseUrl: string;
  private auth: Auth;
  private readonly onTokensRefreshed?: OnTokensRefreshed;

  constructor(config: Config, onTokensRefreshed?: OnTokensRefreshed) {
    this.apiUrl = config.apiUrl;
    this.baseUrl = config.apiUrl + API_PREFIX;
    this.auth = config.auth;
    this.onTokensRefreshed = onTokensRefreshed;
  }

  // --- Account / workspaces -----------------------------------------------

  /** The signed-in user (session mode only). */
  me(): Promise<SessionUser> {
    return this.get<SessionUser>("/auth/me");
  }

  /** Workspaces the session user belongs to. */
  listWorkspaces(): Promise<Workspace[]> {
    return this.get<Workspace[]>("/workspaces");
  }

  // --- Monitors -----------------------------------------------------------

  listMonitors(workspaceId: number): Promise<Monitor[]> {
    return this.get<Monitor[]>(`/workspaces/${workspaceId}/monitors`);
  }

  getMonitor(workspaceId: number, monitorId: number): Promise<Monitor> {
    return this.get<Monitor>(
      `/workspaces/${workspaceId}/monitors/${monitorId}`,
    );
  }

  liveMonitors(workspaceId: number): Promise<LiveMonitors> {
    return this.get<LiveMonitors>(`/workspaces/${workspaceId}/monitors/live`);
  }

  async listChecks(
    workspaceId: number,
    monitorId: number,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<PagedResult<MonitorCheck[]>> {
    const query = this.qs({ limit: opts.limit, offset: opts.offset });
    const env = await this.request<Envelope<MonitorCheck[]>>(
      `/workspaces/${workspaceId}/monitors/${monitorId}/checks${query}`,
    );
    return {
      data: env.data,
      meta: (env.meta as unknown as ChecksMeta) ?? {
        total: env.data.length,
        limit: opts.limit ?? env.data.length,
        offset: opts.offset ?? 0,
      },
    };
  }

  getStats(workspaceId: number, monitorId: number): Promise<MonitorStats> {
    return this.get<MonitorStats>(
      `/workspaces/${workspaceId}/monitors/${monitorId}/stats`,
    );
  }

  getAnalytics(
    workspaceId: number,
    monitorId: number,
  ): Promise<MonitorAnalytics> {
    return this.get<MonitorAnalytics>(
      `/workspaces/${workspaceId}/monitors/${monitorId}/analytics`,
    );
  }

  // --- Incidents ----------------------------------------------------------

  listIncidents(workspaceId: number): Promise<Incident[]> {
    return this.get<Incident[]>(`/workspaces/${workspaceId}/incidents`);
  }

  getIncident(incidentId: number): Promise<IncidentWithMonitor> {
    return this.get<IncidentWithMonitor>(`/incidents/${incidentId}`);
  }

  // --- Heartbeat ----------------------------------------------------------

  async heartbeat(monitorId: number): Promise<unknown> {
    return this.request<unknown>(`/monitors/${monitorId}/heartbeat`, {
      method: "POST",
    });
  }

  // --- internals ----------------------------------------------------------

  /** GETs an endpoint and unwraps the `{ data }` envelope. */
  private async get<T>(path: string): Promise<T> {
    const env = await this.request<Envelope<T>>(path);
    return env.data;
  }

  private authHeaders(): Record<string, string> {
    return this.auth.mode === "key"
      ? { "x-api-key": this.auth.apiKey }
      : { authorization: `Bearer ${this.auth.accessToken}` };
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    allowRefresh = true,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl + path, {
        ...init,
        headers: {
          ...this.authHeaders(),
          accept: "application/json",
          ...init.headers,
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new ApiError(0, `Could not reach ${this.baseUrl}: ${reason}`);
    }

    // Session tokens are short-lived; refresh once on a 401 and replay.
    if (res.status === 401 && this.auth.mode === "session" && allowRefresh) {
      if (await this.tryRefresh()) {
        return this.request<T>(path, init, false);
      }
    }

    const body = await res.text();
    let parsed: unknown;
    try {
      parsed = body ? JSON.parse(body) : undefined;
    } catch {
      parsed = undefined;
    }

    if (!res.ok) {
      const message =
        (parsed as { message?: string })?.message ||
        body ||
        `HTTP ${res.status}`;
      throw new ApiError(res.status, message);
    }

    return parsed as T;
  }

  private async tryRefresh(): Promise<boolean> {
    if (this.auth.mode !== "session") return false;
    const { refreshSession } = await import("./auth.js");
    try {
      const tokens = await refreshSession(this.apiUrl, this.auth.refreshToken);
      this.auth = {
        mode: "session",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      this.onTokensRefreshed?.(tokens);
      return true;
    } catch {
      return false;
    }
  }

  private qs(params: Record<string, number | undefined>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined,
    ) as [string, number][];
    if (entries.length === 0) return "";
    const search = new URLSearchParams(
      entries.map(([k, v]): [string, string] => [k, String(v)]),
    );
    return `?${search.toString()}`;
  }
}
