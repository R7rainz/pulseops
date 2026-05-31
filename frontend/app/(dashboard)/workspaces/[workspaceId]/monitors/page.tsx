import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createMonitor, deleteMonitor } from "./actions";
import Link from "next/link";
import {
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Globe,
  PlusSquare,
  AlertTriangle,
  TerminalSquare,
} from "lucide-react";

interface Monitor {
  id: number;
  name: string;
  url: string;
  status: "UP" | "DOWN" | "PAUSED";
  lastCheckedAt: string | null;
}

export default async function MonitorsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let monitors = [];

  try {
    const monitorsRes = await fetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (monitorsRes.status === 401 || monitorsRes.status === 403) {
      redirect("/login");
    }

    if (monitorsRes.ok) {
      const monitorsData = await monitorsRes.json();
      const extractedMonitors = monitorsData.data || [];
      monitors = Array.isArray(extractedMonitors) ? extractedMonitors : [];
    }
  } catch (error) {
    console.error("Network error fetching monitors:", error);
  }

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* STRICT HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
              <TerminalSquare className="w-8 h-8 text-emerald-400" />
              Engine <span className="text-emerald-400">Core</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
              Active Routing & Telemetry
            </p>
          </div>
          <div className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
            Workspace ID: {workspaceId}
          </div>
        </div>

        {/* BRUTALIST CREATION FORM */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.05)]">
          <div className="mb-6 border-b-2 border-zinc-900 pb-4">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
              <PlusSquare className="w-4 h-4 text-emerald-400" />
              Provision Target
            </h2>
          </div>

          <form
            action={createMonitor}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />

            <div className="md:col-span-4 space-y-2">
              <label
                htmlFor="name"
                className="block text-xs font-bold text-zinc-500 uppercase tracking-widest"
              >
                Designation
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., API Gateway"
                required
                className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none"
              />
            </div>

            <div className="md:col-span-5 space-y-2">
              <label
                htmlFor="url"
                className="block text-xs font-bold text-zinc-500 uppercase tracking-widest"
              >
                Target URL
              </label>
              <input
                id="url"
                name="url"
                type="url"
                placeholder="https://api.pulseops.dev"
                required
                className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full h-[52px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest border-2 border-transparent transition-all rounded-none"
              >
                Deploy
              </button>
            </div>
          </form>
        </div>

        {/* RIGID TARGET GRID */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400 border-b-2 border-zinc-900 pb-2 flex justify-between">
            <span>Active Grid</span>
            <span className="text-zinc-600">[{monitors.length} Nodes]</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.length === 0 ? (
              <div className="col-span-full p-12 border-2 border-dashed border-zinc-800 bg-zinc-950 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">
                <Globe className="w-8 h-8 mx-auto mb-4 text-zinc-700" />
                Zero targets provisioned in current workspace.
              </div>
            ) : (
              monitors.map((monitor: Monitor) => (
                <div
                  key={monitor.id}
                  className="relative flex flex-col justify-between h-40 p-6 bg-zinc-950 border-2 border-zinc-800 hover:border-emerald-500/50 transition-colors group"
                >
                  {/* Invisible Link Overlay */}
                  <Link
                    href={`/workspaces/${workspaceId}/monitors/${monitor.id}`}
                    className="absolute inset-0 z-10"
                  />

                  {/* Top Bar: Status Box & Title */}
                  <div className="relative z-0 pointer-events-none flex items-start gap-4">
                    <div
                      className={`w-3 h-3 mt-1.5 border flex-shrink-0 ${
                        monitor.status === "UP"
                          ? "bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                          : monitor.status === "DOWN"
                            ? "bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                            : "bg-zinc-600 border-zinc-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-zinc-100 uppercase tracking-widest truncate">
                        {monitor.name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate mt-1">
                        {monitor.url}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Bar: Timestamps & Actions */}
                  <div className="relative z-0 flex items-end justify-between mt-4 pt-4 border-t-2 border-zinc-900">
                    <div className="pointer-events-none text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex flex-col gap-1">
                      <span className="text-zinc-600">Last Ping</span>
                      <span
                        className={
                          monitor.status === "UP"
                            ? "text-emerald-400"
                            : monitor.status === "DOWN"
                              ? "text-red-400"
                              : ""
                        }
                      >
                        {monitor.lastCheckedAt
                          ? new Date(monitor.lastCheckedAt).toLocaleTimeString()
                          : "Awaiting..."}
                      </span>
                    </div>

                    {/* Isolated Actions Bar */}
                    <div className="relative z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <form action={deleteMonitor}>
                        <input
                          type="hidden"
                          name="workspaceId"
                          value={workspaceId}
                        />
                        <input
                          type="hidden"
                          name="monitorId"
                          value={monitor.id}
                        />
                        <button
                          type="submit"
                          className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
                          title="Purge Target"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
