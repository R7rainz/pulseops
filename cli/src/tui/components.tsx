import { Box, Text } from "ink";
import type {
  Incident,
  LiveMonitors,
  Monitor,
  MonitorAnalytics,
  MonitorCheck,
  MonitorStats,
} from "../types.js";
import { useTheme, useThemeControls } from "./theme-context.js";
import {
  DOT,
  ARROW,
  statusColor,
  uptimeColor,
  latencyColor,
} from "./theme.js";
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
import { LatencyGraph, StatCard, StatusHeatmap, StatusStrip } from "./charts.js";

export type View = "overview" | "monitors" | "incidents";

export const VIEWS: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "monitors", label: "Monitors" },
  { key: "incidents", label: "Incidents" },
];

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
  const theme = useTheme();
  const host = apiUrl.replace(/^https?:\/\//, "");
  return (
    <Box
      justifyContent="space-between"
      paddingX={1}
      borderStyle="round"
      borderColor={theme.cyan}
    >
      <Box gap={1}>
        <Text color={theme.cyan} bold>
          ◆ PulseOps
        </Text>
        <Text color={theme.muted}>workspace {workspaceId ?? "—"}</Text>
      </Box>
      <Box gap={2}>
        <Text color={connected ? "green" : "red"}>
          {connected ? "● connected" : "● offline"}
        </Text>
        <Text color={theme.muted}>{host}</Text>
        <Text color={refreshing ? theme.indigo : theme.muted}>
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

export function TabBar({ view }: { view: View }) {
  const theme = useTheme();
  return (
    <Box gap={1} paddingX={1}>
      {VIEWS.map((v, i) => {
        const active = v.key === view;
        return (
          <Text
            key={v.key}
            color={active ? theme.ink : theme.muted}
            backgroundColor={active ? theme.cyan : undefined}
            bold={active}
          >
            {` ${i + 1} ${v.label} `}
          </Text>
        );
      })}
    </Box>
  );
}

function StatLine({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Box>
      <Text color={theme.muted}>{label.padEnd(16)}</Text>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text color={theme.indigo} bold>
      {children}
    </Text>
  );
}

// --- Overview ---------------------------------------------------------------

export function Overview({
  monitors,
  incidents,
  live,
  analytics,
  width,
}: {
  monitors: Monitor[];
  incidents: Incident[];
  live: LiveMonitors | undefined;
  analytics: MonitorAnalytics[] | undefined;
  width: number;
}) {
  const theme = useTheme();
  const states = monitors.map((m) => effectiveState(m, live));
  const up = states.filter((s) => s.status === "UP").length;
  const down = states.filter((s) => s.status === "DOWN").length;
  const degraded = states.filter((s) => s.status === "DEGRADED").length;
  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED").length;
  const uptimes = (analytics ?? [])
    .map((a) => a.uptime30Day)
    .filter((n) => typeof n === "number");
  const avgUptime = uptimes.length
    ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length
    : null;
  // The fleet panel takes the space left of the recent-incidents panel; each
  // heatmap cell is "● " (2 cols). Keep the grid inside that inner width.
  const recentWidth = Math.min(46, Math.floor(width * 0.4));
  const fleetInner = Math.max(10, width - recentWidth - 8);
  const cols = Math.max(6, Math.floor(fleetInner / 2));

  const recent = incidents.slice(0, 6);

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <StatCard label="MONITORS" value={String(monitors.length)} color={theme.cyan} />
        <StatCard
          label="UP"
          value={String(up)}
          color="green"
          hint={`${monitors.length ? Math.round((up / monitors.length) * 100) : 0}% of fleet`}
        />
        <StatCard label="DOWN" value={String(down)} color={down ? "red" : theme.muted} />
        <StatCard
          label="DEGRADED"
          value={String(degraded)}
          color={degraded ? "yellow" : theme.muted}
        />
        <StatCard
          label="OPEN INCIDENTS"
          value={String(openIncidents)}
          color={openIncidents ? "red" : theme.muted}
        />
        <StatCard
          label="AVG UPTIME 30d"
          value={avgUptime != null ? fmtPct(avgUptime, 2) : "—"}
          color={avgUptime != null ? uptimeColor(avgUptime) : theme.muted}
        />
      </Box>

      <Box marginTop={1} gap={2}>
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="round"
          borderColor={theme.muted}
          paddingX={1}
        >
          <SectionTitle>FLEET STATUS</SectionTitle>
          <Box marginTop={1}>
            <StatusHeatmap
              monitors={monitors}
              cols={cols}
              effectiveStatus={(m) => effectiveState(m, live).status}
            />
          </Box>
          <Box marginTop={1} gap={2}>
            <Text color="green">{`${DOT} up`}</Text>
            <Text color="yellow">{`${DOT} degraded`}</Text>
            <Text color="red">{`${DOT} down`}</Text>
            <Text color="gray">{`${DOT} paused`}</Text>
          </Box>
        </Box>

        <Box
          flexDirection="column"
          width={Math.min(46, Math.floor(width * 0.4))}
          borderStyle="round"
          borderColor={theme.muted}
          paddingX={1}
        >
          <SectionTitle>RECENT INCIDENTS</SectionTitle>
          {recent.length === 0 ? (
            <Text color={theme.muted}>no incidents 🎉</Text>
          ) : (
            recent.map((inc) => (
              <Box key={inc.id} gap={1}>
                <StatusDot status={inc.status} />
                <Text>{truncate(inc.title, 22).padEnd(22)}</Text>
                <Text color={theme.muted}>
                  {fmtDuration(inc.startedAt, inc.resolvedAt).padStart(7)}
                </Text>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

// --- Monitors ---------------------------------------------------------------

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
  const theme = useTheme();
  const s = effectiveState(monitor, live);
  const nameWidth = Math.max(8, width - 16);
  return (
    <Box>
      <Text color={theme.cyan}>{selected ? ARROW + " " : "  "}</Text>
      <StatusDot status={s.status} />
      <Text bold={selected} color={selected ? theme.text : undefined}>
        {" " + truncate(monitor.name, nameWidth).padEnd(nameWidth)}
      </Text>
      <Text color={latencyColor(s.latency)}>{fmtMs(s.latency).padStart(7)}</Text>
    </Box>
  );
}

function MoreRow({ count, up }: { count: number; up: boolean }) {
  const theme = useTheme();
  if (count <= 0) return null;
  return (
    <Text color={theme.muted}>{"  " + (up ? "▲" : "▼") + ` ${count} more`}</Text>
  );
}

export function MonitorList({
  monitors,
  live,
  selectedIndex,
  width,
  maxRows,
  focused,
}: {
  monitors: Monitor[];
  live: LiveMonitors | undefined;
  selectedIndex: number;
  width: number;
  maxRows: number;
  focused: boolean;
}) {
  const theme = useTheme();
  const win = windowSlice(monitors, selectedIndex, Math.max(1, maxRows));
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={focused ? theme.cyan : theme.muted}
      paddingX={1}
    >
      <SectionTitle>{`MONITORS ${monitors.length ? `(${monitors.length})` : ""}`}</SectionTitle>
      {monitors.length === 0 ? (
        <Text color={theme.muted}>no monitors</Text>
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

export function MonitorDetail({
  monitor,
  live,
  stats,
  analytics,
  checks,
  loading,
  width,
}: {
  monitor: Monitor | undefined;
  live: LiveMonitors | undefined;
  stats: MonitorStats | undefined;
  analytics: MonitorAnalytics | undefined;
  checks: MonitorCheck[] | undefined;
  loading: boolean;
  width: number;
}) {
  const theme = useTheme();
  if (!monitor) {
    return (
      <Box flexGrow={1} borderStyle="round" borderColor={theme.muted} paddingX={1}>
        <Text color={theme.muted}>select a monitor</Text>
      </Box>
    );
  }
  const s = effectiveState(monitor, live);
  // Checks arrive newest-first from the API; plot oldest→newest.
  const ordered = (checks ?? []).slice().reverse();
  const latencies = ordered.map((c) => c.responseTimeMs);
  const inner = Math.max(20, width - 4);

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={theme.cyan}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={theme.text}>
          {truncate(monitor.name, Math.max(12, inner - 14))}
        </Text>
        <Box gap={1}>
          <StatusDot status={s.status} />
          <Text color={statusColor(s.status)} bold>
            {s.status}
          </Text>
        </Box>
      </Box>
      <Text color={theme.muted}>
        {monitor.method} {truncate(monitor.url, inner - 6)}
      </Text>

      <Box marginTop={1} flexDirection="column">
        <SectionTitle>{`LATENCY · LAST ${ordered.length} CHECKS`}</SectionTitle>
        {loading && ordered.length === 0 ? (
          <Text color={theme.muted}>loading…</Text>
        ) : (
          <LatencyGraph values={latencies} width={inner} height={5} />
        )}
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.muted}>availability</Text>
          <StatusStrip checks={ordered} width={inner} />
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box flexDirection="column">
          <SectionTitle>NOW</SectionTitle>
          <StatLine label="type" value={monitor.type} />
          <StatLine label="interval" value={`${monitor.intervalSeconds}s`} />
          <StatLine
            label="latency"
            value={fmtMs(s.latency)}
            color={latencyColor(s.latency)}
          />
          <StatLine
            label="code"
            value={s.statusCode != null ? String(s.statusCode) : "—"}
          />
          <StatLine label="checked" value={fmtRel(s.checkedAt)} />
        </Box>
        <Box flexDirection="column">
          <SectionTitle>PERCENTILES</SectionTitle>
          {stats ? (
            <>
              <StatLine label="p50" value={fmtMs(stats.p50ResponseTimeMs)} />
              <StatLine label="p95" value={fmtMs(stats.p95ResponseTimeMs)} />
              <StatLine label="p99" value={fmtMs(stats.p99ResponseTimeMs)} />
              <StatLine label="checks" value={String(stats.totalChecks)} />
            </>
          ) : (
            <Text color={theme.muted}>{loading ? "loading…" : "—"}</Text>
          )}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <SectionTitle>SLA · 30 DAYS</SectionTitle>
        {analytics ? (
          <>
            <Box>
              <Text color={theme.muted}>{"uptime".padEnd(16)}</Text>
              <Text color={uptimeColor(analytics.uptime30Day)}>
                {bar(analytics.uptime30Day)} {fmtPct(analytics.uptime30Day, 3)}
              </Text>
            </Box>
            <StatLine label="outages" value={String(analytics.totalOutages30Day)} />
            <StatLine
              label="downtime"
              value={`${analytics.downtimeMinutes30Day} min`}
            />
            <StatLine label="avg latency 24h" value={fmtMs(analytics.avgLatency24h)} />
          </>
        ) : (
          <Text color={theme.muted}>{loading ? "loading…" : "—"}</Text>
        )}
      </Box>
    </Box>
  );
}

// --- Incidents --------------------------------------------------------------

export function IncidentList({
  incidents,
  selectedIndex,
  width,
  maxRows,
  focused,
}: {
  incidents: Incident[];
  selectedIndex: number;
  width: number;
  maxRows: number;
  focused: boolean;
}) {
  const theme = useTheme();
  const win = windowSlice(incidents, selectedIndex, Math.max(1, maxRows));
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={focused ? theme.cyan : theme.muted}
      paddingX={1}
    >
      <SectionTitle>{`INCIDENTS ${incidents.length ? `(${incidents.length})` : ""}`}</SectionTitle>
      {incidents.length === 0 ? (
        <Text color={theme.muted}>no incidents 🎉</Text>
      ) : (
        <>
          <MoreRow count={win.hiddenBefore} up />
          {win.slice.map((inc, i) => {
            const selected = win.start + i === selectedIndex;
            const titleWidth = Math.max(10, width - 20);
            return (
              <Box key={inc.id}>
                <Text color={theme.cyan}>{selected ? ARROW + " " : "  "}</Text>
                <StatusDot status={inc.status} />
                <Text bold={selected} color={selected ? theme.text : undefined}>
                  {" " + truncate(inc.title, titleWidth).padEnd(titleWidth)}
                </Text>
                <Text color={theme.muted}>
                  {fmtDuration(inc.startedAt, inc.resolvedAt).padStart(7)}
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

export function IncidentDetail({
  incident,
  monitorName,
  width,
}: {
  incident: Incident | undefined;
  monitorName: (monitorId: number) => string;
  width: number;
}) {
  const theme = useTheme();
  if (!incident) {
    return (
      <Box flexGrow={1} borderStyle="round" borderColor={theme.muted} paddingX={1}>
        <Text color={theme.muted}>select an incident</Text>
      </Box>
    );
  }
  const inner = Math.max(20, width - 4);
  const ongoing = incident.status !== "RESOLVED";
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={theme.cyan}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={theme.text}>
          {truncate(incident.title, Math.max(12, inner - 14))}
        </Text>
        <Box gap={1}>
          <StatusDot status={incident.status} />
          <Text color={statusColor(incident.status)} bold>
            {incident.status}
          </Text>
        </Box>
      </Box>
      <Text color={theme.muted}>{monitorName(incident.monitorId)}</Text>

      <Box marginTop={1} flexDirection="column">
        <SectionTitle>TIMELINE</SectionTitle>
        <StatLine label="started" value={fmtDate(incident.startedAt)} />
        <StatLine
          label="resolved"
          value={incident.resolvedAt ? fmtDate(incident.resolvedAt) : "ongoing"}
          color={ongoing ? "yellow" : undefined}
        />
        <StatLine
          label="duration"
          value={fmtDuration(incident.startedAt, incident.resolvedAt)}
          color={ongoing ? "red" : undefined}
        />
        <StatLine label="incident #" value={String(incident.id)} />
        <StatLine label="monitor #" value={String(incident.monitorId)} />
      </Box>
    </Box>
  );
}

// --- overlays / chrome ------------------------------------------------------

export function ThemePicker({ selected }: { selected: number }) {
  const theme = useTheme();
  const { themes } = useThemeControls();
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.cyan}
      paddingX={2}
      paddingY={1}
    >
      <Text color={theme.cyan} bold>
        ◆ Theme
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {themes.map((t, i) => (
          <Box key={t.name} gap={1}>
            <Text color={i === selected ? theme.text : theme.muted}>
              {(i === selected ? ARROW + " " : "  ") + t.label.padEnd(10)}
            </Text>
            <Text color={t.cyan}>{"████"}</Text>
            <Text color={t.indigo}>{"████"}</Text>
            <Text color={t.chart}>{"▁▃▅▇"}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.muted}>j/k choose · enter apply · t/esc close</Text>
      </Box>
    </Box>
  );
}

export function HelpOverlay() {
  const theme = useTheme();
  const rows: [string, string][] = [
    ["1 / 2 / 3", "Jump to Overview / Monitors / Incidents"],
    ["Tab / ⇧Tab", "Cycle views"],
    ["j / k  ↓ / ↑", "Move selection"],
    ["gg / G", "Top / bottom of list"],
    ["⌃d / ⌃u", "Half-page down / up"],
    ["n / e", "New / edit monitor (Monitors)"],
    ["p / c / d", "Pause·resume / check now / delete (Monitors)"],
    ["a / R", "Acknowledge / resolve (Incidents)"],
    ["t / T", "Cycle theme / theme picker"],
    ["r", "Refresh now"],
    ["?", "Toggle this help"],
    ["q / ⌃c", "Quit"],
  ];
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.cyan}
      paddingX={2}
      paddingY={1}
    >
      <Text color={theme.cyan} bold>
        ◆ Keyboard shortcuts
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {rows.map(([k, d]) => (
          <Box key={k} gap={1}>
            <Text color={theme.indigo}>{k.padEnd(14)}</Text>
            <Text color={theme.text}>{d}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.muted}>press ? or esc to close</Text>
      </Box>
    </Box>
  );
}

/** A transient status line for action results (success / error). */
export function Toast({ text, kind }: { text: string; kind: "ok" | "err" }) {
  return (
    <Box paddingX={1}>
      <Text color={kind === "ok" ? "green" : "red"}>
        {(kind === "ok" ? "✓ " : "✖ ") + text}
      </Text>
    </Box>
  );
}

export function Footer({
  view,
  error,
  themeLabel,
  canWrite,
}: {
  view: View;
  error: string | undefined;
  themeLabel: string;
  canWrite: boolean;
}) {
  const theme = useTheme();
  if (error) {
    return (
      <Box paddingX={1}>
        <Text color="red">✖ {error}</Text>
      </Box>
    );
  }
  const nav =
    view === "overview"
      ? "1/2/3 views · t theme · r reload"
      : view === "monitors"
        ? "j/k move · n new · e edit · p pause · c check · d del · 1/2/3 views"
        : "j/k move · a ack · R resolve · 1/2/3 views";
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Text color={theme.muted}>{`${nav} · ? help · q quit`}</Text>
      <Text color={theme.muted}>
        {(canWrite ? "" : "read-only · ") + `theme: ${themeLabel}`}
      </Text>
    </Box>
  );
}
