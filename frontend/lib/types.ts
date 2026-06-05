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

export interface MonitorStats {
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercentage: number;
  averageResponseTimeMs: number;
  latestStatus: MonitorStatus;
  range24h: {
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercentage: number;
    averageResponseTimeMs: number;
  };
  range30d: {
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercentage: number;
    averageResponseTimeMs: number;
  };
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
