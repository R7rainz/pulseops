/**
 * Terminal output helpers: JSON passthrough, aligned tables, and status
 * colouring. No runtime dependencies — colour is raw ANSI, disabled when the
 * output isn't a TTY or NO_COLOR is set.
 */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const ANSI: Record<string, string> = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function paint(code: string, s: string): string {
  return useColor ? `${code}${s}${ANSI.reset}` : s;
}

export const color = {
  dim: (s: string) => paint(ANSI.dim, s),
  bold: (s: string) => paint(ANSI.bold, s),
  red: (s: string) => paint(ANSI.red, s),
  green: (s: string) => paint(ANSI.green, s),
  yellow: (s: string) => paint(ANSI.yellow, s),
  cyan: (s: string) => paint(ANSI.cyan, s),
  gray: (s: string) => paint(ANSI.gray, s),
};

/** Colour-codes a monitor/incident status token. */
export function statusColor(status: string): string {
  switch (status) {
    case "UP":
    case "RESOLVED":
      return color.green(status);
    case "DOWN":
    case "OPEN":
      return color.red(status);
    case "DEGRADED":
    case "ACKNOWLEDGED":
      return color.yellow(status);
    case "PAUSED":
      return color.gray(status);
    default:
      return status;
  }
}

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

export function dash(value: unknown): string {
  return value === null || value === undefined || value === ""
    ? color.gray("—")
    : String(value);
}

/** Length of a string ignoring ANSI escape sequences, for alignment. */
function visibleLength(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function pad(s: string, width: number): string {
  const gap = width - visibleLength(s);
  return gap > 0 ? s + " ".repeat(gap) : s;
}

export interface Column<T> {
  header: string;
  get: (row: T) => string;
}

/** Renders rows as an aligned, header-underlined table. */
export function table<T>(rows: T[], columns: Column<T>[]): string {
  if (rows.length === 0) return color.gray("(no results)");

  const cells = rows.map((row) => columns.map((c) => c.get(row)));
  const widths = columns.map((c, i) =>
    Math.max(
      visibleLength(c.header),
      ...cells.map((r) => visibleLength(r[i])),
    ),
  );

  const lines: string[] = [];
  lines.push(
    columns.map((c, i) => color.bold(pad(c.header, widths[i]))).join("  "),
  );
  lines.push(color.gray(widths.map((w) => "─".repeat(w)).join("  ")));
  for (const r of cells) {
    lines.push(r.map((cell, i) => pad(cell, widths[i])).join("  "));
  }
  return lines.join("\n");
}

/** Renders a single record as an aligned key/value block. */
export function keyValue(pairs: [string, string][]): string {
  const width = Math.max(...pairs.map(([k]) => k.length));
  return pairs
    .map(([k, v]) => `${color.gray(pad(k, width))}  ${v}`)
    .join("\n");
}

/** ISO string → compact local `YYYY-MM-DD HH:MM`, or a dash. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return color.gray("—");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

/** Milliseconds → `123ms` / `1.2s`, or a dash. */
export function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return color.gray("—");
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
