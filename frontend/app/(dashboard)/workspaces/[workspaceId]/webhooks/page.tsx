import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  FileText,
} from "lucide-react";
import { WEBHOOK_EVENTS } from "./constants";
import { CreateWebhookForm } from "./create-form";
import { WebhookActions } from "./webhook-actions";

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTestedAt: string | null;
  createdAt: string;
}

export default async function WebhooksPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) redirect("/login");

  let webhooks: Webhook[] = [];
  let role = "";
  let workspaceName = "";

  try {
    const [wsRes, hooksRes] = await Promise.all([
      apiFetch(`${API_URL}/api/v1/workspaces/${workspaceId}`, {
        token,
        cookieStore,
        cache: "no-store",
      }),
      apiFetch(`${API_URL}/api/v1/workspaces/${workspaceId}/webhooks`, {
        token,
        cookieStore,
        cache: "no-store",
      }),
    ]);

    if (wsRes.ok) {
      const wsData = await wsRes.json();
      role = wsData.data?.role || "";
      workspaceName = wsData.data?.name || "";
    }

    if (hooksRes.ok) {
      const hooksData = await hooksRes.json();
      webhooks = hooksData.data || [];
    }

    if (wsRes.status === 401 || wsRes.status === 403) {
      redirect("/login");
    }
  } catch (err) {
    console.error("Failed to load webhooks:", err);
  }

  const canEdit = role === "OWNER" || role === "ADMIN";

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Grid
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
                <Zap className="w-8 h-8 text-cyan-400" />
                Webhook <span className="text-cyan-400">Endpoints</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
                {workspaceName || `Workspace #${workspaceId}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
              <span className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300">
                {webhooks.length} Configured
              </span>
              <span className="px-3 py-1.5 bg-emerald-950/30 border border-emerald-800 text-emerald-400">
                {webhooks.filter((w) => w.isActive).length} Active
              </span>
            </div>
          </div>
        </div>

        {canEdit && <CreateWebhookForm workspaceId={workspaceId} />}

        {webhooks.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-zinc-800 bg-zinc-950 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">
            No webhook endpoints configured.
            {canEdit && (
              <p className="text-zinc-600 text-xs mt-3">
                Add one above to receive incident alerts via HTTP POST.
              </p>
            )}
          </div>
        ) : (
          <div className="border-2 border-zinc-800 bg-zinc-950 divide-y-2 divide-zinc-900">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="p-5 hover:bg-zinc-900/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`p-1.5 border-2 ${
                        wh.isActive
                          ? "bg-emerald-950/20 border-emerald-500/50"
                          : "bg-zinc-900 border-zinc-700"
                      }`}>
                        {wh.isActive
                          ? <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          : <Zap className="w-3.5 h-3.5 text-zinc-600" />
                        }
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">
                          {wh.name || "Unnamed Webhook"}
                        </h3>
                        <p className="text-xs text-zinc-500 truncate max-w-lg mt-0.5 font-mono">
                          {wh.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {wh.events.map((evt) => (
                        <span
                          key={evt}
                          className="text-[10px] font-bold px-2 py-0.5 border bg-zinc-950 uppercase tracking-widest text-cyan-400 border-cyan-800"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>

                    {wh.lastTestedAt && (
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                        Last tested: {new Date(wh.lastTestedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/workspaces/${workspaceId}/webhooks/${wh.id}`}
                      className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
                      title="Delivery Logs"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>

                    {canEdit && (
                      <WebhookActions
                        webhookId={wh.id}
                        workspaceId={workspaceId}
                        isActive={wh.isActive}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
