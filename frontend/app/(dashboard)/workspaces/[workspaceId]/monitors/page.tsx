import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { createMonitor } from "./actions";
import { Plus, Crown, Zap } from "lucide-react";
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
  let planTier: string | null = null;

  try {
    const [monitorsRes, wsRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/monitors`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
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
      planTier = wsData.data?.planTier ?? null;
    }
  } catch (error) {
    console.error("Network error fetching monitors:", error);
  }

  if (monitorsStatus === 401 || monitorsStatus === 403) {
    redirect("/login");
  }

  const canEdit = role === "OWNER" || role === "ADMIN";

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Monitors</h1>
            <p className="mt-1 text-sm text-muted-foreground">Uptime, latency &amp; SSL across your endpoints</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                planTier === "PRO"
                  ? "border-degraded/30 bg-degraded/10 text-degraded"
                  : "border-border text-muted-foreground"
              }`}
            >
              {planTier === "PRO" ? <Crown className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {planTier || "FREE"} plan
            </span>
          </div>
        </div>

        {/* CREATE FORM */}
        {canEdit ? (
          <div className="glass rounded-lg p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Plus className="h-4 w-4 text-up" />
              Add a monitor
            </h2>
            <form action={createMonitor} className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="space-y-1.5 md:col-span-4">
                <label htmlFor="name" className="block text-sm font-medium text-foreground">Name</label>
                <input id="name" name="name" type="text" placeholder="e.g. API Gateway" required className="field" />
              </div>
              <div className="space-y-1.5 md:col-span-5">
                <label htmlFor="url" className="block text-sm font-medium text-foreground">URL</label>
                <input id="url" name="url" type="url" placeholder="https://api.example.com" required className="field" />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="btn btn-primary h-11 w-full">
                  <Plus className="h-4 w-4" />
                  Add monitor
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            You need admin access to add monitors in this workspace.
          </div>
        )}

        {/* MONITORS + MEMBERS */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
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
