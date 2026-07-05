/** Presentation helpers for the TUI (plain strings; colour is applied by components). */

export function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

/** ISO → compact local `MM-DD HH:MM`, or a dash. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

/** ISO → coarse relative time like `12s ago`, `3m ago`. */
export function fmtRel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return String(iso);
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Human duration between two ISO instants (or now, if unresolved). */
export function fmtDuration(
  startedAt: string,
  resolvedAt: string | null,
): string {
  const start = new Date(startedAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** A block-character progress/uptime bar, e.g. `████████░░`. */
export function bar(pct: number, width = 18): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

/** Truncate to width with an ellipsis so rows never wrap. */
export function truncate(s: string, width: number): string {
  if (s.length <= width) return s;
  if (width <= 1) return s.slice(0, width);
  return s.slice(0, width - 1) + "…";
}

export interface Window<T> {
  slice: T[];
  /** Index within the full list of the first item in `slice`. */
  start: number;
  hiddenBefore: number;
  hiddenAfter: number;
}

/**
 * Returns a `size`-row window over `items` that keeps `selected` visible,
 * centring it when possible and clamping at the ends. Used to scroll long
 * lists inside a fixed viewport.
 */
export function windowSlice<T>(
  items: T[],
  selected: number,
  size: number,
): Window<T> {
  if (items.length <= size) {
    return { slice: items, start: 0, hiddenBefore: 0, hiddenAfter: 0 };
  }
  const half = Math.floor(size / 2);
  const start = Math.max(0, Math.min(selected - half, items.length - size));
  return {
    slice: items.slice(start, start + size),
    start,
    hiddenBefore: start,
    hiddenAfter: items.length - (start + size),
  };
}
