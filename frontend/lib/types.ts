export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PAUSED";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Monitor {
  id: number;
  workspaceId: number;
  name: string;
  url: string;
  method: HttpMethod;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number;
  status: MonitorStatus;
  isActive: boolean;
  lastCheckedAt: string | null;
  maintenanceStartAt: string | null;
  maintenanceEndAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorCheck {
  id: number;
  monitorId: number;
  status: MonitorStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

interface StatsRange {
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  degradedChecks: number;
  uptimePercentage: number;
  averageResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
}

export interface MonitorStats extends StatsRange {
  latestStatus: MonitorStatus;
  range24h: StatsRange;
  range30d: StatsRange;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export type CreateMonitorInput = {
  name: string;
  url: string;
  method?: HttpMethod;
  intervalSeconds?: number;
  timeoutMs?: number;
  expectedStatus?: number;
  maintenanceStartAt?: string | null;
  maintenanceEndAt?: string | null;
};

export type UpdateMonitorInput = Partial<CreateMonitorInput>;
