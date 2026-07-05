import type { Config } from "./config.js";
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

/**
 * Thin typed client over the PulseOps read API. Authenticates every request
 * with the workspace API key (`x-api-key`). Method names and paths mirror the
 * OpenAPI spec — regenerate `src/generated/schema.d.ts` with `pnpm gen` to
 * diff this surface against the live contract.
 */
export class PulseOpsClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: Config) {
    this.baseUrl = config.apiUrl + API_PREFIX;
    this.apiKey = config.apiKey;
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

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl + path, {
        ...init,
        headers: {
          "x-api-key": this.apiKey,
          accept: "application/json",
          ...init.headers,
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new ApiError(0, `Could not reach ${this.baseUrl}: ${reason}`);
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
