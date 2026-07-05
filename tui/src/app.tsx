import { useEffect, useMemo, useState } from "react";
import { Box, useApp, useInput, useStdout } from "ink";
import type { PulseOpsClient } from "@pulseops/cli/client";
import type { Config } from "@pulseops/cli/config";
import type {
  Incident,
  LiveMonitors,
  Monitor,
  MonitorAnalytics,
  MonitorStats,
} from "@pulseops/cli/types";
import { usePoll, useClock } from "./hooks.js";
import {
  DetailPane,
  Footer,
  Header,
  IncidentList,
  MonitorList,
  Tabs,
  type View,
} from "./components.js";

const LIST_INTERVAL = 15_000;
const LIVE_INTERVAL = 5_000;
const INCIDENT_INTERVAL = 20_000;

export function App({
  client,
  config,
}: {
  client: PulseOpsClient;
  config: Config;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const workspaceId = config.workspaceId!;
  useClock(1000); // re-render so "updated 3s ago" stays current

  const width = stdout?.columns ?? 100;
  const rows = stdout?.rows ?? 24;
  const listWidth = Math.max(28, Math.min(46, Math.floor(width * 0.4)));
  // Rows available to a list after header (3), tabs (1), borders+title (3),
  // scroll hints (2) and footer (1).
  const bodyRows = Math.max(3, rows - 10);

  const monitorsPoll = usePoll<Monitor[]>(
    () => client.listMonitors(workspaceId),
    LIST_INTERVAL,
  );
  const livePoll = usePoll<LiveMonitors>(
    () => client.liveMonitors(workspaceId),
    LIVE_INTERVAL,
  );
  const incidentsPoll = usePoll<Incident[]>(
    () => client.listIncidents(workspaceId),
    INCIDENT_INTERVAL,
  );

  const monitors = useMemo(() => monitorsPoll.data ?? [], [monitorsPoll.data]);
  const incidents = useMemo(
    () => incidentsPoll.data ?? [],
    [incidentsPoll.data],
  );

  const [view, setView] = useState<View>("monitors");
  const [monitorSel, setMonitorSel] = useState(0);
  const [incidentSel, setIncidentSel] = useState(0);

  // Keep selection in range as lists change size.
  useEffect(() => {
    if (monitorSel > monitors.length - 1) setMonitorSel(Math.max(0, monitors.length - 1));
  }, [monitors.length, monitorSel]);
  useEffect(() => {
    if (incidentSel > incidents.length - 1) setIncidentSel(Math.max(0, incidents.length - 1));
  }, [incidents.length, incidentSel]);

  const selectedMonitor = monitors[monitorSel];

  // Load stats + analytics for the selected monitor (and refresh on the live tick).
  const [detail, setDetail] = useState<{
    id: number;
    stats?: MonitorStats;
    analytics?: MonitorAnalytics;
  }>();
  const [detailLoading, setDetailLoading] = useState(false);
  useEffect(() => {
    if (!selectedMonitor) return;
    const id = selectedMonitor.id;
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([
      client.getStats(workspaceId, id),
      client.getAnalytics(workspaceId, id),
    ])
      .then(([stats, analytics]) => {
        if (!cancelled) setDetail({ id, stats, analytics });
      })
      .catch(() => {
        if (!cancelled) setDetail({ id });
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, workspaceId, selectedMonitor?.id]);

  const refreshAll = () => {
    monitorsPoll.refresh();
    livePoll.refresh();
    incidentsPoll.refresh();
  };

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (key.tab || input === "\t") {
      setView((v) => (v === "monitors" ? "incidents" : "monitors"));
      return;
    }
    if (input === "m") setView("monitors");
    if (input === "i") setView("incidents");
    if (input === "r") refreshAll();

    const len = view === "monitors" ? monitors.length : incidents.length;
    if (len === 0) return;
    const setSel = view === "monitors" ? setMonitorSel : setIncidentSel;
    if (key.upArrow || input === "k") setSel((s) => (s - 1 + len) % len);
    if (key.downArrow || input === "j") setSel((s) => (s + 1) % len);
  });

  const error =
    monitorsPoll.error || livePoll.error || incidentsPoll.error;
  const connected = !monitorsPoll.error && monitorsPoll.updatedAt != null;
  const updatedAt = monitorsPoll.updatedAt;
  const refreshing =
    monitorsPoll.refreshing || livePoll.refreshing || incidentsPoll.refreshing;

  return (
    <Box flexDirection="column" width={width}>
      <Header
        workspaceId={workspaceId}
        apiUrl={config.apiUrl}
        updatedAt={updatedAt}
        refreshing={refreshing}
        connected={connected}
      />
      <Tabs view={view} />
      {view === "monitors" ? (
        <Box>
          <MonitorList
            monitors={monitors}
            live={livePoll.data}
            selectedIndex={monitorSel}
            width={listWidth}
            maxRows={bodyRows}
          />
          <DetailPane
            monitor={selectedMonitor}
            live={livePoll.data}
            stats={detail?.id === selectedMonitor?.id ? detail?.stats : undefined}
            analytics={
              detail?.id === selectedMonitor?.id ? detail?.analytics : undefined
            }
            loading={detailLoading}
          />
        </Box>
      ) : (
        <IncidentList
          incidents={incidents}
          selectedIndex={incidentSel}
          width={width}
          maxRows={bodyRows}
        />
      )}
      <Footer view={view} error={error} />
    </Box>
  );
}
