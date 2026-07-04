import { AlertTriangle, ServerCrash, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export interface PublicMonitor {
  id: number;
  name: string;
  status: "UP" | "DOWN" | "PAUSED";
  uptimeHistory: number[];
}

export interface StatusData {
  workspaceName: string;
  systemState: "OPERATIONAL" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE";
  metrics: { total: number; down: number; paused: number };
  monitors: PublicMonitor[];
}

const SYSTEM = {
  OPERATIONAL: {
    icon: ShieldCheck,
    title: "All systems operational",
    text: "text-up",
    bg: "bg-up/10",
    border: "border-up/30",
  },
  PARTIAL_OUTAGE: {
    icon: AlertTriangle,
    title: "Degraded performance",
    text: "text-degraded",
    bg: "bg-degraded/10",
    border: "border-degraded/30",
  },
  MAJOR_OUTAGE: {
    icon: ServerCrash,
    title: "Major outage",
    text: "text-down",
    bg: "bg-down/10",
    border: "border-down/30",
  },
} as const;

export function StatusOverview({ data }: { data: StatusData }) {
  const { systemState, metrics, monitors } = data;
  const sys = SYSTEM[systemState] ?? SYSTEM.OPERATIONAL;
  const SysIcon = sys.icon;

  return (
    <>
      <div className={cn("flex items-center gap-4 rounded-xl border p-5 sm:p-6", sys.bg, sys.border)}>
        <SysIcon
          className={cn("h-8 w-8 shrink-0", sys.text, systemState !== "OPERATIONAL" && "animate-pulse")}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className={cn("font-display text-lg font-semibold", sys.text)}>{sys.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {metrics.total} {metrics.total === 1 ? "monitor" : "monitors"}
            {metrics.down > 0 && <span className="text-down"> · {metrics.down} down</span>}
            {metrics.paused > 0 && <span> · {metrics.paused} paused</span>}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Monitors</h3>
        {monitors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No public monitors yet.
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((node) => (
              <div key={node.id} className="glass rounded-lg p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="truncate font-display text-sm font-medium text-foreground">{node.name}</span>
                  <StatusBadge status={node.status} size="sm" />
                </div>
                <div className="flex h-8 items-end gap-px" role="img" aria-label={`90-day uptime history for ${node.name}`}>
                  {node.uptimeHistory.map((ratio, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex-1 rounded-t-[1px]",
                        ratio >= 0.98 ? "bg-up" : ratio >= 0.9 ? "bg-degraded" : "bg-down",
                      )}
                      style={{ height: `${Math.max(8, Math.round(ratio * 100))}%`, opacity: ratio > 0 ? 1 : 0.12 }}
                      title={`Day ${i + 1}: ${Math.round(ratio * 100)}% uptime`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>90 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
