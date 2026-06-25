import { notFound } from "next/navigation";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft, Activity, ServerCrash, PauseCircle, ShieldCheck, AlertTriangle } from "lucide-react";

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

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  let statusData: StatusData | null = null;

  try {
    const res = await fetch(`${API_URL}/api/v1/status/${slug}`, {
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
      <div className="min-h-screen bg-transparent flex items-center justify-center text-[#93A096] text-body-md font-medium">
        Unable to establish telemetry uplink.
      </div>
    );
  }

  const { workspaceName, systemState, monitors } = statusData;

  return (
    <main className="min-h-screen bg-transparent text-[#EEEAE0] selection:bg-[#9FD8BD]/20">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        {/* BACK LINK */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[rgba(238,234,224,0.1)] text-label-md font-medium text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD]/40 transition-colors rounded-[999px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Console
          </Link>
        </div>

        {/* PUBLIC HEADER */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-medium text-[#EEEAE0]">
            {workspaceName}
          </h1>
          <p className="text-body-md text-[#93A096]">
            Public Telemetry & System Status
          </p>
        </div>

        {/* MASTER STATUS BANNER */}
        <div className="gradient-border-shell">
          <div className={`shell-inner p-[29.6px] flex flex-col items-center text-center gap-4 ${
            systemState === "OPERATIONAL"
              ? ""
              : systemState === "PARTIAL_OUTAGE"
                ? ""
                : ""
          }`}>
            {systemState === "OPERATIONAL" && <ShieldCheck className="w-12 h-12 text-[#9FD8BD]" />}
            {systemState === "PARTIAL_OUTAGE" && <AlertTriangle className="w-12 h-12 text-[#E2A356] animate-pulse" />}
            {systemState === "MAJOR_OUTAGE" && <ServerCrash className="w-12 h-12 text-[#C2766B] animate-pulse" />}

            <div>
              <h2 className={`text-xl font-medium ${
                systemState === "OPERATIONAL" ? "text-[#9FD8BD]" : systemState === "PARTIAL_OUTAGE" ? "text-[#E2A356]" : "text-[#C2766B]"
              }`}>
                {systemState === "OPERATIONAL" ? "All Systems Operational" : systemState === "PARTIAL_OUTAGE" ? "Degraded Performance Detected" : "Critical Infrastructure Outage"}
              </h2>
              <p className="text-body-md text-[#93A096] mt-2">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* NODE MATRIX */}
        <div className="space-y-4">
          <h3 className="text-label-md font-medium text-[#93A096] border-b border-[rgba(238,234,224,0.06)] pb-2">
            Infrastructure Nodes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.length === 0 ? (
              <div className="col-span-full p-8 border border-dashed border-[rgba(238,234,224,0.1)] text-center text-[#93A096]/60 text-label-md font-medium rounded-[9px]">
                No public nodes provisioned.
              </div>
            ) : (
              monitors.map((node) => (
                <div key={node.id} className="glass rounded-[9px] p-[12px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-[#EEEAE0] truncate pr-4">
                      {node.name}
                    </span>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-medium ${
                        node.status === "UP" ? "text-[#9FD8BD]" : node.status === "DOWN" ? "text-[#C2766B]" : "text-[#93A096]"
                      }`}>
                        {node.status}
                      </span>
                      {node.status === "UP" && <Activity className="w-4 h-4 text-[#9FD8BD]" />}
                      {node.status === "DOWN" && <ServerCrash className="w-4 h-4 text-[#C2766B]" />}
                      {node.status === "PAUSED" && <PauseCircle className="w-4 h-4 text-[#93A096]" />}
                    </div>
                  </div>

                  {/* SPARKLINE: 90-day uptime history */}
                  <div className="flex items-end gap-[1px] h-8">
                    {node.uptimeHistory.map((ratio, i) => {
                      const barHeight = Math.max(2, Math.round(ratio * 28));
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${barHeight}px`,
                            backgroundColor:
                              ratio >= 0.98
                                ? "#9FD8BD"
                                : ratio >= 0.9
                                  ? "#E2A356"
                                  : "#C2766B",
                            opacity: ratio > 0 ? 1 : 0.15,
                          }}
                          title={`Day ${i + 1}: ${Math.round(ratio * 100)}% uptime`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center pt-12 border-t border-[rgba(238,234,224,0.06)]">
          <a href="/" className="text-label-md text-[#93A096]/60 hover:text-[#93A096] font-medium transition-colors">
            Powered by PulseOps Telemetry
          </a>
        </div>

      </div>
    </main>
  );
}
