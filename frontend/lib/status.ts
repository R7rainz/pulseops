import {
  Activity,
  ServerCrash,
  PauseCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PAUSED";

/**
 * Single source of truth for how a monitor status looks across the app.
 * Status is always conveyed by icon + label + colour — never colour alone
 * (WCAG: don't rely on colour to communicate meaning).
 */
export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** text colour utility */
  text: string;
  /** translucent fill utility */
  bg: string;
  /** border utility */
  border: string;
  /** solid dot/fill utility */
  solid: string;
}

export const STATUS_META: Record<MonitorStatus, StatusMeta> = {
  UP: {
    label: "Operational",
    icon: Activity,
    text: "text-up",
    bg: "bg-up/10",
    border: "border-up/30",
    solid: "bg-up",
  },
  DEGRADED: {
    label: "Degraded",
    icon: AlertTriangle,
    text: "text-degraded",
    bg: "bg-degraded/10",
    border: "border-degraded/30",
    solid: "bg-degraded",
  },
  DOWN: {
    label: "Down",
    icon: ServerCrash,
    text: "text-down",
    bg: "bg-down/10",
    border: "border-down/30",
    solid: "bg-down",
  },
  PAUSED: {
    label: "Paused",
    icon: PauseCircle,
    text: "text-paused",
    bg: "bg-paused/10",
    border: "border-paused/30",
    solid: "bg-paused",
  },
};

export function statusMeta(status: string | null | undefined): StatusMeta {
  return STATUS_META[(status as MonitorStatus) ?? "PAUSED"] ?? STATUS_META.PAUSED;
}
