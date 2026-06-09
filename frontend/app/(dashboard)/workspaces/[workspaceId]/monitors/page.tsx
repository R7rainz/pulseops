import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { createMonitor } from "./actions";
import { PlusSquare, TerminalSquare } from "lucide-react";
import MonitorView from "./monitor-view";
import MembersPanel from "@/components/MembersPanel";

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
  let monitorsStatus: number | null = null;
  let role: string | null = null;

  try {
    const [monitorsRes, wsRes] = await Promise.all([
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" },
      ),
    ]);

    monitorsStatus = monitorsRes.status;

    if (monitorsRes.ok) {
      const monitorsData = await monitorsRes.json();
      const extractedMonitors = monitorsData.data || [];
      monitors = Array.isArray(extractedMonitors) ? extractedMonitors : [];
    }

    if (wsRes.ok) {
      const wsData = await wsRes.json();
      role = wsData.data?.role ?? null;
    }
  } catch (error) {
    console.error("Network error fetching monitors:", error);
  }

  if (monitorsStatus === 401 || monitorsStatus === 403) {
    redirect("/login");
  }

  const canEdit = role === "OWNER" || role === "ADMIN";

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">

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
        {canEdit && (
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
                <label htmlFor="name" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">
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
                <label htmlFor="url" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">
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
        )}

        {!canEdit && (
          <div className="bg-zinc-950 border-2 border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
            Elevated privileges required to provision new targets.
          </div>
        )}

        {/* client toggle */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            <MonitorView monitors={monitors} workspaceId={workspaceId} canEdit={canEdit} />
          </div>
          <div className="xl:col-span-1">
            <MembersPanel workspaceId={workspaceId} />
          </div>
        </div>

      </div>
    </main>
  );
}
