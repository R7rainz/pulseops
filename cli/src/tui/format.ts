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

const SPARK = "▁▂▃▄▅▆▇█";

/**
 * A single-row sparkline from `values`, resampled to `width` chars. Empty or
 * flat series render as a baseline. Nulls are treated as gaps (rendered low).
 */
export function sparkline(values: (number | null | undefined)[], width = 24): string {
  const nums = values.map((v) => (v == null || Number.isNaN(v) ? null : v));
  const present = nums.filter((v): v is number => v != null);
  if (present.length === 0) return " ".repeat(width);
  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min || 1;
  const out: string[] = [];
  for (let x = 0; x < width; x++) {
    // Nearest-sample resample so short series still fill the width.
    const idx = Math.floor((x / width) * nums.length);
    const v = nums[Math.min(nums.length - 1, idx)];
    if (v == null) {
      out.push(" ");
      continue;
    }
    const level = Math.round(((v - min) / span) * (SPARK.length - 1));
    out.push(SPARK[Math.max(0, Math.min(SPARK.length - 1, level))]);
  }
  return out.join("");
}

// Braille cell = 2 dot-columns × 4 dot-rows; bit per dot, base U+2800.
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

/**
 * Renders `values` as a braille line chart: `height` rows of `width` chars,
 * giving `width*2 × height*4` dot resolution. Returns one string per row (top
 * first). The line is **interpolated** across the width and **connected**
 * (vertical runs are filled between adjacent samples) so it reads as a
 * continuous line rather than scattered dots. Used for the latency graph.
 */
export function brailleChart(
  values: (number | null | undefined)[],
  width: number,
  height: number,
): string[] {
  const cols = Math.max(1, width) * 2;
  const dotRows = Math.max(1, height) * 4;
  const nums = values.map((v) => (v == null || Number.isNaN(v) ? null : v));
  const present = nums.filter((v): v is number => v != null);
  const grid = Array.from({ length: height }, () =>
    new Array<number>(width).fill(0),
  );
  if (present.length === 0) {
    return grid.map(() => " ".repeat(width));
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min || 1;
  const lastIdx = nums.length - 1;

  // Linear-interpolate the value at a fractional sample index (null on a gap).
  const sampleAt = (x: number): number | null => {
    const t = lastIdx === 0 ? 0 : (x / (cols - 1 || 1)) * lastIdx;
    const i0 = Math.floor(t);
    const i1 = Math.min(lastIdx, i0 + 1);
    const v0 = nums[i0];
    const v1 = nums[i1];
    if (v0 == null && v1 == null) return null;
    if (v0 == null) return v1!;
    if (v1 == null) return v0;
    return v0 + (v1 - v0) * (t - i0);
  };

  const dotYOf = (v: number) =>
    Math.round((1 - (v - min) / span) * (dotRows - 1)); // top = high value

  const plot = (x: number, dotY: number) => {
    const cellX = x >> 1;
    const cellY = dotY >> 2;
    if (cellX < width && cellY < height && dotY >= 0)
      grid[cellY][cellX] |= BRAILLE_BITS[dotY % 4][x % 2];
  };

  let prevY: number | null = null;
  for (let x = 0; x < cols; x++) {
    const v = sampleAt(x);
    if (v == null) {
      prevY = null;
      continue;
    }
    const y = dotYOf(v);
    // Connect to the previous column by filling the vertical run between them.
    const from = prevY == null ? y : prevY;
    for (let yy = Math.min(from, y); yy <= Math.max(from, y); yy++) plot(x, yy);
    prevY = y;
  }
  return grid.map((row) =>
    row.map((mask) => (mask === 0 ? " " : String.fromCharCode(0x2800 + mask))).join(""),
  );
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
