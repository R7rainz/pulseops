import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { createMonitor } from "./actions";
import { PlusSquare, TerminalSquare, Crown, Zap } from "lucide-react";
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
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* STRICT HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(238,234,224,0.08)] pb-6">
          <div>
            <h1 className="text-3xl font-medium text-[#EEEAE0] flex items-center gap-3">
              <TerminalSquare className="w-8 h-8 text-[#9FD8BD]" />
              Engine <span className="text-[#9FD8BD]">Core</span>
            </h1>
            <p className="text-sm text-[#93A096] mt-2">
              Active Routing &amp; Telemetry
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 border text-xs font-medium flex items-center gap-2 ${
              planTier === "PRO"
                ? "bg-[rgba(227,163,86,0.1)] border-[#E2A356]/50 text-[#E2A356]"
                : "bg-transparent border-[rgba(238,234,224,0.06)] text-[#93A096]"
            }`}>
              {planTier === "PRO" ? <Crown className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {planTier || "FREE"}
            </div>
            <div className="px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#A3D1DF] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#A3D1DF] animate-pulse" />
              Workspace ID: {workspaceId}
            </div>
          </div>
        </div>

        {/* BRUTALIST CREATION FORM */}
        {canEdit && (
          <div className="bg-transparent border border-[rgba(238,234,224,0.06)] p-8">
            <div className="mb-6 border-b border-[rgba(238,234,224,0.08)] pb-4">
              <h2 className="text-sm font-medium text-[#EEEAE0] flex items-center gap-2">
                <PlusSquare className="w-4 h-4 text-[#9FD8BD]" />
                Provision Target
              </h2>
            </div>

            <form
              action={createMonitor}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end"
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />

              <div className="md:col-span-4 space-y-2">
                <label htmlFor="name" className="block text-xs font-medium text-[#93A096]">
                  Designation
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., API Gateway"
                  required
                  className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-4 py-3 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors rounded-[4px]"
                />
              </div>

              <div className="md:col-span-5 space-y-2">
                <label htmlFor="url" className="block text-xs font-medium text-[#93A096]">
                  Target URL
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="https://api.pulseops.dev"
                  required
                  className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-4 py-3 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors rounded-[4px]"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="w-full h-[52px] bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 font-medium rounded-[999px] transition-all"
                >
                  Deploy
                </button>
              </div>
            </form>
          </div>
        )}

        {!canEdit && (
          <div className="bg-transparent border border-dashed border-[rgba(238,234,224,0.06)] p-8 text-center text-[#93A096] text-xs font-medium">
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
