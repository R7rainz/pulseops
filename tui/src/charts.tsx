import { Box, Text } from "ink";
import type { ReactNode } from "react";
import type { Monitor, MonitorCheck } from "@pulseops/cli/types";
import { useTheme } from "./theme-context.js";
import { statusColor, DOT } from "./theme.js";
import { brailleChart, fmtMs, sparkline } from "./format.js";

/** A coloured single-row sparkline of latency values. */
export function Sparkline({
  values,
  width = 24,
  color,
}: {
  values: (number | null | undefined)[];
  width?: number;
  color?: string;
}) {
  const theme = useTheme();
  return <Text color={color ?? theme.chart}>{sparkline(values, width)}</Text>;
}

/**
 * A braille line graph of a latency series with min/max axis labels. Values are
 * expected oldest→newest (left→right).
 */
export function LatencyGraph({
  values,
  width,
  height = 5,
}: {
  values: (number | null | undefined)[];
  width: number;
  height?: number;
}) {
  const theme = useTheme();
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  const plotWidth = Math.max(8, width - 8);
  const rows = brailleChart(values, plotWidth, height);
  const max = nums.length ? Math.max(...nums) : 0;
  const min = nums.length ? Math.min(...nums) : 0;

  if (nums.length === 0) {
    return <Text color={theme.muted}>no latency samples yet</Text>;
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => {
        // Label the top row with the max and the bottom row with the min.
        const label =
          i === 0 ? fmtMs(max) : i === rows.length - 1 ? fmtMs(min) : "";
        return (
          <Box key={i}>
            <Text color={theme.muted}>{label.padStart(7)} </Text>
            <Text color={theme.chart}>{row}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

/** Run-length encode consecutive equal values so we emit fewer <Text> spans. */
function runs<T>(items: T[], key: (t: T) => string): { value: T; count: number }[] {
  const out: { value: T; count: number }[] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (last && key(last.value) === key(it)) last.count++;
    else out.push({ value: it, count: 1 });
  }
  return out;
}

/**
 * A horizontal availability strip: one block per recent check, coloured by
 * status. `checks` are expected oldest→newest; older checks fall off the left.
 */
export function StatusStrip({
  checks,
  width,
}: {
  checks: MonitorCheck[];
  width: number;
}) {
  const theme = useTheme();
  if (checks.length === 0) {
    return <Text color={theme.muted}>{"░".repeat(Math.max(1, width))}</Text>;
  }
  const slice = checks.slice(-width);
  return (
    <Text>
      {runs(slice, (c) => c.status).map((run, i) => (
        <Text key={i} color={statusColor(run.value.status)}>
          {"█".repeat(run.count)}
        </Text>
      ))}
    </Text>
  );
}

/** A dense grid of status dots for the whole fleet, wrapped to `cols` per row. */
export function StatusHeatmap({
  monitors,
  cols,
  effectiveStatus,
}: {
  monitors: Monitor[];
  cols: number;
  effectiveStatus: (m: Monitor) => string;
}) {
  const theme = useTheme();
  if (monitors.length === 0) {
    return <Text color={theme.muted}>no monitors</Text>;
  }
  const rows: Monitor[][] = [];
  for (let i = 0; i < monitors.length; i += cols) {
    rows.push(monitors.slice(i, i + cols));
  }
  return (
    <Box flexDirection="column">
      {rows.map((row, i) => (
        <Text key={i}>
          {row.map((m) => (
            <Text key={m.id} color={statusColor(effectiveStatus(m))}>
              {DOT + " "}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}

/** A compact bordered metric card: a big value over a small label. */
export function StatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: ReactNode;
  color?: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.muted}
      paddingX={1}
      minWidth={14}
      flexGrow={1}
    >
      <Text color={theme.muted}>{label}</Text>
      <Text bold color={color ?? theme.text}>
        {value}
      </Text>
      {hint ? <Text color={theme.muted}>{hint}</Text> : <Text> </Text>}
    </Box>
  );
}
