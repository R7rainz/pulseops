import { notFound } from "next/navigation";
import { Activity, ServerCrash, PauseCircle, ShieldCheck, AlertTriangle } from "lucide-react";

interface PublicMonitor {
  id: number;
  name: string;
  status: "UP" | "DOWN" | "PAUSED";
}

interface StatusData {
  workspaceName: string;
  systemState: "OPERATIONAL" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE";
  metrics: { total: number; down: number; paused: number };
  monitors: PublicMonitor[];
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  let statusData: StatusData | null = null;

  try {
    const res = await fetch(`http://127.0.0.1:4000/api/v1/status/${slug}`, {
      next: { revalidate: 30 },
    });

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest font-bold">
        Unable to establish telemetry uplink.
      </div>
    );
  }

  const { workspaceName, systemState, monitors } = statusData;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-mono selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        {/* PUBLIC HEADER */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-widest uppercase text-zinc-100">
            {workspaceName}
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
            Public Telemetry & System Status
          </p>
        </div>

        {/* MASTER STATUS BANNER */}
        <div className={`p-8 border-2 flex flex-col items-center text-center gap-4 ${
          systemState === "OPERATIONAL"
            ? "bg-emerald-950/20 border-emerald-900/50"
            : systemState === "PARTIAL_OUTAGE"
              ? "bg-amber-950/20 border-amber-900/50"
              : "bg-red-950/20 border-red-900/50"
        }`}>
          {systemState === "OPERATIONAL" && <ShieldCheck className="w-12 h-12 text-emerald-500" />}
          {systemState === "PARTIAL_OUTAGE" && <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />}
          {systemState === "MAJOR_OUTAGE" && <ServerCrash className="w-12 h-12 text-red-500 animate-pulse" />}

          <div>
            <h2 className={`text-xl font-black uppercase tracking-widest ${
              systemState === "OPERATIONAL" ? "text-emerald-400" : systemState === "PARTIAL_OUTAGE" ? "text-amber-400" : "text-red-400"
            }`}>
              {systemState === "OPERATIONAL" ? "All Systems Operational" : systemState === "PARTIAL_OUTAGE" ? "Degraded Performance Detected" : "Critical Infrastructure Outage"}
            </h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-2">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* NODE MATRIX */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
            Infrastructure Nodes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.length === 0 ? (
              <div className="col-span-full p-8 border-2 border-dashed border-zinc-800 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
                No public nodes provisioned.
              </div>
            ) : (
              monitors.map((node) => (
                <div key={node.id} className="p-4 bg-zinc-900/50 border-2 border-zinc-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest truncate pr-4">
                    {node.name}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      node.status === "UP" ? "text-emerald-500" : node.status === "DOWN" ? "text-red-500" : "text-zinc-500"
                    }`}>
                      {node.status}
                    </span>
                    {node.status === "UP" && <Activity className="w-4 h-4 text-emerald-500" />}
                    {node.status === "DOWN" && <ServerCrash className="w-4 h-4 text-red-500" />}
                    {node.status === "PAUSED" && <PauseCircle className="w-4 h-4 text-zinc-600" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center pt-12 border-t-2 border-zinc-900">
          <a href="/" className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest font-bold transition-colors">
            Powered by PulseOps Telemetry
          </a>
        </div>

      </div>
    </main>
  );
}
