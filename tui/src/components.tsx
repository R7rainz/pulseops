import { Box, Text } from "ink";
import type {
  Incident,
  LiveMonitors,
  Monitor,
  MonitorAnalytics,
  MonitorStats,
} from "@pulseops/cli/types";
import { DOT, ARROW, iris, statusColor, uptimeColor } from "./theme.js";
import {
  bar,
  fmtDate,
  fmtDuration,
  fmtMs,
  fmtPct,
  fmtRel,
  truncate,
  windowSlice,
} from "./format.js";

export type View = "monitors" | "incidents";

/** Merge a monitor's persisted fields with its live-cache state, preferring live. */
export function effectiveState(monitor: Monitor, live: LiveMonitors | undefined) {
  const l = live?.[String(monitor.id)];
  return {
    status: l?.status ?? monitor.status,
    latency: l?.latency ?? monitor.lastResponseTime,
    statusCode: l?.statusCode ?? monitor.lastStatusCode,
    checkedAt: l?.lastChecked ?? monitor.lastCheckedAt,
  };
}

export function StatusDot({ status }: { status: string }) {
  return <Text color={statusColor(status)}>{DOT}</Text>;
}

export function Header({
  workspaceId,
  apiUrl,
  updatedAt,
  refreshing,
  connected,
}: {
  workspaceId: number | undefined;
  apiUrl: string;
  updatedAt: number | undefined;
  refreshing: boolean;
  connected: boolean;
}) {
  const host = apiUrl.replace(/^https?:\/\//, "");
  return (
    <Box
      justifyContent="space-between"
      paddingX={1}
      borderStyle="round"
      borderColor={iris.cyan}
    >
      <Box gap={1}>
        <Text color={iris.cyan} bold>
          ◆ PulseOps
        </Text>
        <Text color={iris.muted}>workspace {workspaceId ?? "—"}</Text>
      </Box>
      <Box gap={2}>
        <Text color={connected ? "green" : "red"}>
          {connected ? "● connected" : "● offline"}
        </Text>
        <Text color={iris.muted}>{host}</Text>
        <Text color={refreshing ? iris.indigo : iris.muted}>
          {refreshing
            ? "⟳ refreshing"
            : updatedAt
              ? `updated ${fmtRel(new Date(updatedAt).toISOString())}`
              : "—"}
        </Text>
      </Box>
    </Box>
  );
}

export function Tabs({ view }: { view: View }) {
  const tab = (label: string, active: boolean) => (
    <Text
      color={active ? iris.ink : iris.muted}
      backgroundColor={active ? iris.cyan : undefined}
      bold={active}
    >
      {` ${label} `}
    </Text>
  );
  return (
    <Box gap={1} paddingX={1}>
      {tab("Monitors", view === "monitors")}
      {tab("Incidents", view === "incidents")}
    </Box>
  );
}

function MonitorRow({
  monitor,
  live,
  selected,
  width,
}: {
  monitor: Monitor;
  live: LiveMonitors | undefined;
  selected: boolean;
  width: number;
}) {
  const s = effectiveState(monitor, live);
  const nameWidth = Math.max(8, width - 16);
  return (
    <Box>
      <Text color={iris.cyan}>{selected ? ARROW + " " : "  "}</Text>
      <StatusDot status={s.status} />
      <Text bold={selected} color={selected ? iris.text : undefined}>
        {" " + truncate(monitor.name, nameWidth).padEnd(nameWidth)}
      </Text>
      <Text color={iris.muted}>{fmtMs(s.latency).padStart(7)}</Text>
    </Box>
  );
}

function MoreRow({ count, up }: { count: number; up: boolean }) {
  if (count <= 0) return null;
  return (
    <Text color={iris.muted}>
      {"  " + (up ? "▲" : "▼") + ` ${count} more`}
    </Text>
  );
}

export function MonitorList({
  monitors,
  live,
  selectedIndex,
  width,
  maxRows,
}: {
  monitors: Monitor[];
  live: LiveMonitors | undefined;
  selectedIndex: number;
  width: number;
  maxRows: number;
}) {
  const win = windowSlice(monitors, selectedIndex, Math.max(1, maxRows));
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={iris.muted}
      paddingX={1}
    >
      <Text color={iris.indigo} bold>
        MONITORS {monitors.length ? `(${monitors.length})` : ""}
      </Text>
      {monitors.length === 0 ? (
        <Text color={iris.muted}>no monitors</Text>
      ) : (
        <>
          <MoreRow count={win.hiddenBefore} up />
          {win.slice.map((m, i) => (
            <MonitorRow
              key={m.id}
              monitor={m}
              live={live}
              selected={win.start + i === selectedIndex}
              width={width - 4}
            />
          ))}
          <MoreRow count={win.hiddenAfter} up={false} />
        </>
      )}
    </Box>
  );
}

function StatLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Text color={iris.muted}>{label.padEnd(16)}</Text>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

export function DetailPane({
  monitor,
  live,
  stats,
  analytics,
  loading,
}: {
  monitor: Monitor | undefined;
  live: LiveMonitors | undefined;
  stats: MonitorStats | undefined;
  analytics: MonitorAnalytics | undefined;
  loading: boolean;
}) {
  if (!monitor) {
    return (
      <Box flexGrow={1} borderStyle="round" borderColor={iris.muted} paddingX={1}>
        <Text color={iris.muted}>select a monitor</Text>
      </Box>
    );
  }
  const s = effectiveState(monitor, live);
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={iris.cyan}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={iris.text}>
          {truncate(monitor.name, 32)}
        </Text>
        <Box gap={1}>
          <StatusDot status={s.status} />
          <Text color={statusColor(s.status)} bold>
            {s.status}
          </Text>
        </Box>
      </Box>
      <Text color={iris.muted}>
        {monitor.method} {truncate(monitor.url, 44)}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <StatLine label="type" value={monitor.type} />
        <StatLine label="interval" value={`${monitor.intervalSeconds}s`} />
        <StatLine label="last latency" value={fmtMs(s.latency)} />
        <StatLine label="last code" value={s.statusCode != null ? String(s.statusCode) : "—"} />
        <StatLine label="last checked" value={fmtRel(s.checkedAt)} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={iris.indigo} bold>
          SLA · 30 DAYS
        </Text>
        {analytics ? (
          <>
            <Box>
              <Text color={iris.muted}>{"uptime".padEnd(16)}</Text>
              <Text color={uptimeColor(analytics.uptime30Day)}>
                {bar(analytics.uptime30Day)} {fmtPct(analytics.uptime30Day, 3)}
              </Text>
            </Box>
            <StatLine label="outages" value={String(analytics.totalOutages30Day)} />
            <StatLine label="downtime" value={`${analytics.downtimeMinutes30Day} min`} />
            <StatLine label="avg latency 24h" value={fmtMs(analytics.avgLatency24h)} />
          </>
        ) : (
          <Text color={iris.muted}>{loading ? "loading…" : "—"}</Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={iris.indigo} bold>
          LATENCY PERCENTILES
        </Text>
        {stats ? (
          <>
            <StatLine
              label="uptime (all)"
              value={fmtPct(stats.uptimePercentage)}
              color={uptimeColor(stats.uptimePercentage)}
            />
            <StatLine label="p50" value={fmtMs(stats.p50ResponseTimeMs)} />
            <StatLine label="p95" value={fmtMs(stats.p95ResponseTimeMs)} />
            <StatLine label="p99" value={fmtMs(stats.p99ResponseTimeMs)} />
            <StatLine label="checks" value={String(stats.totalChecks)} />
          </>
        ) : (
          <Text color={iris.muted}>{loading ? "loading…" : "—"}</Text>
        )}
      </Box>
    </Box>
  );
}

export function IncidentList({
  incidents,
  selectedIndex,
  width,
  maxRows,
}: {
  incidents: Incident[];
  selectedIndex: number;
  width: number;
  maxRows: number;
}) {
  const win = windowSlice(incidents, selectedIndex, Math.max(1, maxRows));
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={iris.muted}
      paddingX={1}
    >
      <Text color={iris.indigo} bold>
        INCIDENTS {incidents.length ? `(${incidents.length})` : ""}
      </Text>
      {incidents.length === 0 ? (
        <Text color={iris.muted}>no incidents 🎉</Text>
      ) : (
        <>
          <MoreRow count={win.hiddenBefore} up />
          {win.slice.map((inc, i) => {
            const selected = win.start + i === selectedIndex;
            const titleWidth = Math.max(12, width - 30);
            return (
              <Box key={inc.id}>
                <Text color={iris.cyan}>{selected ? ARROW + " " : "  "}</Text>
                <StatusDot status={inc.status} />
                <Text bold={selected}>
                  {" " + truncate(inc.title, titleWidth).padEnd(titleWidth)}
                </Text>
                <Text color={iris.muted}>
                  {" " + fmtDate(inc.startedAt).padEnd(12)}
                </Text>
                <Text color={iris.muted}>
                  {fmtDuration(inc.startedAt, inc.resolvedAt).padStart(8)}
                </Text>
              </Box>
            );
          })}
          <MoreRow count={win.hiddenAfter} up={false} />
        </>
      )}
    </Box>
  );
}

export function Footer({ view, error }: { view: View; error: string | undefined }) {
  if (error) {
    return (
      <Box paddingX={1}>
        <Text color="red">✖ {error}</Text>
      </Box>
    );
  }
  const keys =
    view === "monitors"
      ? "↑/↓ select · tab incidents · r refresh · q quit"
      : "↑/↓ select · tab monitors · r refresh · q quit";
  return (
    <Box paddingX={1}>
      <Text color={iris.muted}>{keys}</Text>
    </Box>
  );
}
