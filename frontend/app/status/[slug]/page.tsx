import { notFound } from "next/navigation";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import { ShieldCheck, ServerCrash, AlertTriangle } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import { Brand } from "@/components/Brand";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface PublicMonitor {
  id: number;
  name: string;
  status: "UP" | "DOWN" | "PAUSED";
  uptimeHistory: number[];
}

interface StatusData {
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

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let statusData: StatusData | null = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/status/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) {
      if (res.status === 404) notFound();
      throw new Error("Failed to load status");
    }
    const json = await res.json();
    statusData = json.data;
  } catch (err) {
    console.error("Public status fetch error:", err);
  }

  if (!statusData) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
        <div>
          <p className="font-display text-lg font-medium text-foreground">Status unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">We couldn’t load this status page. Please try again.</p>
        </div>
      </div>
    );
  }

  const { workspaceName, systemState, metrics, monitors } = statusData;
  const sys = SYSTEM[systemState] ?? SYSTEM.OPERATIONAL;
  const SysIcon = sys.icon;
  const updated = new Date();

  return (
    <main className="relative min-h-dvh overflow-hidden text-foreground">
      {/* ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-background" />
        <AmbientGlow />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <header className="flex items-center justify-between">
          <Brand href="/" size="sm" />
          <span className="font-mono text-[11px] text-muted-foreground">
            Updated {updated.toLocaleString()}
          </span>
        </header>

        <div className="mt-12 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{workspaceName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">System status &amp; uptime</p>
        </div>

        {/* system banner */}
        <div className={cn("mt-8 flex items-center gap-4 rounded-xl border p-5 sm:p-6", sys.bg, sys.border)}>
          <SysIcon className={cn("h-8 w-8 shrink-0", sys.text, systemState !== "OPERATIONAL" && "animate-pulse")} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className={cn("font-display text-lg font-semibold", sys.text)}>{sys.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {metrics.total} {metrics.total === 1 ? "monitor" : "monitors"}
              {metrics.down > 0 && <span className="text-down"> · {metrics.down} down</span>}
              {metrics.paused > 0 && <span> · {metrics.paused} paused</span>}
            </p>
          </div>
        </div>

        {/* monitors */}
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
                  {/* 90-day uptime bars */}
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

        <footer className="mt-14 border-t border-border pt-6 text-center">
          <Link href="/" className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-up">
            Powered by PulseOps
          </Link>
        </footer>
      </div>
    </main>
  );
}
