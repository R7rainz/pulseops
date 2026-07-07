import { useEffect, useMemo, useRef, useState } from "react";
import { Box, useApp, useInput, useStdout } from "ink";
import type { PulseOpsClient } from "../client.js";
import type { Config } from "../config.js";
import type {
  CreateMonitorInput,
  Incident,
  LiveMonitors,
  Monitor,
  MonitorAnalytics,
  MonitorCheck,
  MonitorStats,
} from "../types.js";
import { usePoll, useClock } from "./hooks.js";
import { ThemeProvider, useThemeControls } from "./theme-context.js";
import {
  Footer,
  Header,
  HelpOverlay,
  IncidentDetail,
  IncidentList,
  MonitorDetail,
  MonitorList,
  Overview,
  TabBar,
  ThemePicker,
  Toast,
  VIEWS,
  type View,
} from "./components.js";
import { ConfirmDialog, MonitorForm } from "./forms.js";

const LIST_INTERVAL = 15_000;
const LIVE_INTERVAL = 5_000;
const INCIDENT_INTERVAL = 20_000;
const FLEET_ANALYTICS_INTERVAL = 60_000;
const CHECKS_LIMIT = 60;

type Overlay = "none" | "help" | "theme";

/** An action overlay that owns keyboard input while open. */
type Action =
  | { kind: "form"; mode: "create" | "edit"; monitor?: Monitor }
  | { kind: "confirm"; message: string; danger: boolean; run: () => Promise<unknown>; okMsg: string };

interface ToastState {
  text: string;
  kind: "ok" | "err";
}

/** The dashboard, wrapped so every pane can read the active theme. */
export function App(props: { client: PulseOpsClient; config: Config }) {
  return (
    <ThemeProvider>
      <Dashboard {...props} />
    </ThemeProvider>
  );
}

function Dashboard({
  client,
  config,
}: {
  client: PulseOpsClient;
  config: Config;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { theme, themes, setTheme, cycle } = useThemeControls();
  const workspaceId = config.workspaceId!;
  useClock(1000); // re-render so "updated 3s ago" stays current

  const width = stdout?.columns ?? 100;
  const rows = stdout?.rows ?? 24;
  const listWidth = Math.max(30, Math.min(48, Math.floor(width * 0.36)));
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

  const [view, setView] = useState<View>("overview");
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [themeSel, setThemeSel] = useState(0);
  const [monitorSel, setMonitorSel] = useState(0);
  const [incidentSel, setIncidentSel] = useState(0);

  // Write actions (create/edit/pause/delete/ack/resolve).
  const canWrite = config.auth.mode === "session";
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const flash = (text: string, kind: "ok" | "err") => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // Keep selection in range as lists change size.
  useEffect(() => {
    if (monitorSel > monitors.length - 1)
      setMonitorSel(Math.max(0, monitors.length - 1));
  }, [monitors.length, monitorSel]);
  useEffect(() => {
    if (incidentSel > incidents.length - 1)
      setIncidentSel(Math.max(0, incidents.length - 1));
  }, [incidents.length, incidentSel]);

  const selectedMonitor = monitors[monitorSel];
  const selectedIncident = incidents[incidentSel];

  const monitorName = useMemo(() => {
    const byId = new Map(monitors.map((m) => [m.id, m.name]));
    return (id: number) => byId.get(id) ?? `monitor #${id}`;
  }, [monitors]);

  // Load stats + analytics + recent checks for the selected monitor.
  const [detail, setDetail] = useState<{
    id: number;
    stats?: MonitorStats;
    analytics?: MonitorAnalytics;
    checks?: MonitorCheck[];
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
      client
        .listChecks(workspaceId, id, { limit: CHECKS_LIMIT })
        .then((r) => r.data)
        .catch(() => [] as MonitorCheck[]),
    ])
      .then(([stats, analytics, checks]) => {
        if (!cancelled) setDetail({ id, stats, analytics, checks });
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

  // Fleet-wide 30-day uptime for the overview card. Refreshed slowly; re-runs
  // whenever the set of monitors changes.
  const [fleetAnalytics, setFleetAnalytics] = useState<MonitorAnalytics[]>();
  const monitorIds = useMemo(() => monitors.map((m) => m.id).join(","), [monitors]);
  useEffect(() => {
    if (monitors.length === 0) {
      setFleetAnalytics([]);
      return;
    }
    let cancelled = false;
    const run = () => {
      Promise.all(
        monitors.map((m) =>
          client.getAnalytics(workspaceId, m.id).catch(() => null),
        ),
      ).then((res) => {
        if (!cancelled)
          setFleetAnalytics(res.filter((a): a is MonitorAnalytics => a != null));
      });
    };
    run();
    const timer = setInterval(run, FLEET_ANALYTICS_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, workspaceId, monitorIds]);

  const refreshAll = () => {
    monitorsPoll.refresh();
    livePoll.refresh();
    incidentsPoll.refresh();
  };

  // --- write actions ------------------------------------------------------

  const requireWrite = (): boolean => {
    if (!canWrite) {
      flash("Read-only (API key) — run `pulseops login` to edit.", "err");
      return false;
    }
    return true;
  };

  /** Run a mutation, flashing success/error and refreshing on success. */
  const runWrite = async (
    fn: () => Promise<unknown>,
    okMsg: string,
    refresh: () => void,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      flash(okMsg, "ok");
      refresh();
      return true;
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e), "err");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitForm = async (input: CreateMonitorInput) => {
    if (!action || action.kind !== "form") return;
    const editing = action.mode === "edit" && action.monitor;
    setBusy(true);
    setFormError(undefined);
    try {
      if (editing) await client.updateMonitor(workspaceId, action.monitor!.id, input);
      else await client.createMonitor(workspaceId, input);
      monitorsPoll.refresh();
      setAction(null);
      flash(editing ? `updated ${input.name}` : `created ${input.name}`, "ok");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmRun = async () => {
    if (!action || action.kind !== "confirm") return;
    const ok = await runWrite(action.run, action.okMsg, () => {
      monitorsPoll.refresh();
      incidentsPoll.refresh();
    });
    if (ok) setAction(null);
  };

  // Tracks a pending `g` so a second `g` within the window triggers `gg` (top).
  const pendingG = useRef(false);

  useInput((input, key) => {
    // A form/confirm overlay owns all input via its own component.
    if (action) return;

    // Always-available quit.
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    // Theme picker overlay owns input while open.
    if (overlay === "theme") {
      if (key.escape || input === "T" || input === "t") {
        setOverlay("none");
        return;
      }
      if (input === "j" || key.downArrow)
        setThemeSel((s) => Math.min(themes.length - 1, s + 1));
      if (input === "k" || key.upArrow) setThemeSel((s) => Math.max(0, s - 1));
      if (key.return) {
        setTheme(themes[themeSel].name);
        setOverlay("none");
      }
      return;
    }

    // Help overlay.
    if (overlay === "help") {
      if (key.escape || input === "?") setOverlay("none");
      return;
    }

    if (input === "?") {
      setOverlay("help");
      return;
    }
    if (input === "T") {
      setThemeSel(Math.max(0, themes.findIndex((t) => t.name === theme.name)));
      setOverlay("theme");
      return;
    }
    if (input === "t") {
      cycle();
      return;
    }

    // View switching: number keys, Tab / Shift-Tab.
    if (input === "1") return setView("overview");
    if (input === "2") return setView("monitors");
    if (input === "3") return setView("incidents");
    if (key.tab) {
      const idx = VIEWS.findIndex((v) => v.key === view);
      const next = key.shift
        ? (idx - 1 + VIEWS.length) % VIEWS.length
        : (idx + 1) % VIEWS.length;
      setView(VIEWS[next].key);
      return;
    }

    if (input === "r") {
      refreshAll();
      return;
    }

    // Write actions on the active view (guarded to signed-in sessions).
    if (view === "monitors") {
      if (input === "n") {
        if (requireWrite()) {
          setFormError(undefined);
          setAction({ kind: "form", mode: "create" });
        }
        return;
      }
      if (selectedMonitor) {
        const m = selectedMonitor;
        if (input === "e") {
          if (requireWrite()) {
            setFormError(undefined);
            setAction({ kind: "form", mode: "edit", monitor: m });
          }
          return;
        }
        if (input === "p") {
          if (requireWrite()) {
            const paused = m.status === "PAUSED";
            void runWrite(
              () =>
                paused
                  ? client.resumeMonitor(workspaceId, m.id)
                  : client.pauseMonitor(workspaceId, m.id),
              paused ? `resumed ${m.name}` : `paused ${m.name}`,
              monitorsPoll.refresh,
            );
          }
          return;
        }
        if (input === "c") {
          if (requireWrite())
            void runWrite(
              () => client.runCheck(workspaceId, m.id),
              `triggered a check for ${m.name}`,
              monitorsPoll.refresh,
            );
          return;
        }
        if (input === "d" && !key.ctrl) {
          if (requireWrite())
            setAction({
              kind: "confirm",
              danger: true,
              message: `Delete monitor "${m.name}" and all its history?`,
              run: () => client.deleteMonitor(workspaceId, m.id),
              okMsg: `deleted ${m.name}`,
            });
          return;
        }
      }
    }
    if (view === "incidents" && selectedIncident) {
      const inc = selectedIncident;
      if (input === "a") {
        if (requireWrite())
          void runWrite(
            () => client.acknowledgeIncident(inc.id),
            `acknowledged incident #${inc.id}`,
            incidentsPoll.refresh,
          );
        return;
      }
      if (input === "R") {
        if (requireWrite())
          void runWrite(
            () => client.resolveIncident(inc.id),
            `resolved incident #${inc.id}`,
            incidentsPoll.refresh,
          );
        return;
      }
    }

    // List navigation applies to the active view's list (overview has none).
    if (view === "overview") return;
    const len = view === "monitors" ? monitors.length : incidents.length;
    const setSel = view === "monitors" ? setMonitorSel : setIncidentSel;
    const clamp = (n: number) => Math.max(0, Math.min(len - 1, n));
    if (len === 0) return;

    if (input === "g") {
      if (pendingG.current) {
        pendingG.current = false;
        setSel(0);
      } else {
        pendingG.current = true;
        setTimeout(() => {
          pendingG.current = false;
        }, 500);
      }
      return;
    }
    if (input === "G") {
      setSel(len - 1);
      return;
    }

    const half = Math.max(1, Math.floor(bodyRows / 2));
    if (key.ctrl && input === "d") {
      setSel((s) => clamp(s + half));
      return;
    }
    if (key.ctrl && input === "u") {
      setSel((s) => clamp(s - half));
      return;
    }

    if (input === "j" || key.downArrow) setSel((s) => clamp(s + 1));
    if (input === "k" || key.upArrow) setSel((s) => clamp(s - 1));
  });

  const error = monitorsPoll.error || livePoll.error || incidentsPoll.error;
  const connected = !monitorsPoll.error && monitorsPoll.updatedAt != null;
  const updatedAt = monitorsPoll.updatedAt;
  const refreshing =
    monitorsPoll.refreshing || livePoll.refreshing || incidentsPoll.refreshing;

  const detailFor = (id: number | undefined) =>
    detail?.id === id ? detail : undefined;
  const d = detailFor(selectedMonitor?.id);

  return (
    <Box flexDirection="column" width={width}>
      <Header
        workspaceId={workspaceId}
        apiUrl={config.apiUrl}
        updatedAt={updatedAt}
        refreshing={refreshing}
        connected={connected}
      />
      <TabBar view={view} />

      {action?.kind === "form" ? (
        <MonitorForm
          mode={action.mode}
          initial={action.monitor}
          busy={busy}
          submitError={formError}
          onSubmit={submitForm}
          onCancel={() => setAction(null)}
        />
      ) : action?.kind === "confirm" ? (
        <ConfirmDialog
          message={action.message}
          danger={action.danger}
          busy={busy}
          onConfirm={confirmRun}
          onCancel={() => setAction(null)}
        />
      ) : overlay === "help" ? (
        <HelpOverlay />
      ) : overlay === "theme" ? (
        <ThemePicker selected={themeSel} />
      ) : view === "overview" ? (
        <Overview
          monitors={monitors}
          incidents={incidents}
          live={livePoll.data}
          analytics={fleetAnalytics}
          width={width}
        />
      ) : view === "monitors" ? (
        <Box>
          <MonitorList
            monitors={monitors}
            live={livePoll.data}
            selectedIndex={monitorSel}
            width={listWidth}
            maxRows={bodyRows}
            focused
          />
          <MonitorDetail
            monitor={selectedMonitor}
            live={livePoll.data}
            stats={d?.stats}
            analytics={d?.analytics}
            checks={d?.checks}
            loading={detailLoading}
            width={width - listWidth}
          />
        </Box>
      ) : (
        <Box>
          <IncidentList
            incidents={incidents}
            selectedIndex={incidentSel}
            width={listWidth}
            maxRows={bodyRows}
            focused
          />
          <IncidentDetail
            incident={selectedIncident}
            monitorName={monitorName}
            width={width - listWidth}
          />
        </Box>
      )}

      {toast ? <Toast text={toast.text} kind={toast.kind} /> : null}
      <Footer view={view} error={error} themeLabel={theme.label} canWrite={canWrite} />
    </Box>
  );
}
