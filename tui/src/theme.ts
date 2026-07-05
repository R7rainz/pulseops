/**
 * Colour tokens for the TUI. Mirrors the app's "Iris" accent (cyan → indigo)
 * so the terminal dashboard reads as the same product as the web UI. Values are
 * truecolor hex where Ink accepts it, with named fallbacks for status states.
 */

export const iris = {
  cyan: "#22d3ee",
  indigo: "#818cf8",
  ink: "#0b0f1a",
  muted: "gray",
  text: "#e5e7eb",
} as const;

/** Ink colour for a monitor/incident status token. */
export function statusColor(status: string): string {
  switch (status) {
    case "UP":
    case "RESOLVED":
      return "green";
    case "DOWN":
    case "OPEN":
      return "red";
    case "DEGRADED":
    case "ACKNOWLEDGED":
      return "yellow";
    case "PAUSED":
      return "gray";
    default:
      return iris.text;
  }
}

/** Colour an uptime percentage by SLA band. */
export function uptimeColor(pct: number): string {
  if (pct >= 99.9) return "green";
  if (pct >= 99) return "greenBright";
  if (pct >= 95) return "yellow";
  return "red";
}

export const DOT = "●";
export const ARROW = "▸";
