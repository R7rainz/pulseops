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
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Grid
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(238,234,224,0.08)] pb-6">
            <div>
              <h1 className="text-3xl font-medium text-[#EEEAE0] flex items-center gap-3">
                <Zap className="w-8 h-8 text-[#A3D1DF]" />
                Webhook <span className="text-[#A3D1DF]">Endpoints</span>
              </h1>
              <p className="text-sm text-[#93A096] mt-2">
                {workspaceName || `Workspace #${workspaceId}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="px-3 py-1.5 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] text-[#EEEAE0]">
                {webhooks.length} Configured
              </span>
              <span className="px-3 py-1.5 bg-[rgba(159,216,189,0.1)] border border-[#9FD8BD]/50 text-[#9FD8BD]">
                {webhooks.filter((w) => w.isActive).length} Active
              </span>
            </div>
          </div>
        </div>

        {canEdit && <CreateWebhookForm workspaceId={workspaceId} />}

        {webhooks.length === 0 ? (
          <div className="p-12 border border-dashed border-[rgba(238,234,224,0.06)] bg-transparent text-center text-[#93A096] text-sm font-medium">
            No webhook endpoints configured.
            {canEdit && (
              <p className="text-[#93A096] text-xs mt-3">
                Add one above to receive incident alerts via HTTP POST.
              </p>
            )}
          </div>
        ) : (
          <div className="border border-[rgba(238,234,224,0.06)] bg-transparent divide-y divide-[rgba(238,234,224,0.08)]">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="p-5 hover:bg-[rgba(238,234,224,0.04)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`p-1.5 border ${
                        wh.isActive
                          ? "bg-[rgba(159,216,189,0.1)] border-[#9FD8BD]/50"
                          : "bg-[rgba(238,234,224,0.04)] border-[rgba(238,234,224,0.06)]"
                      }`}>
                        {wh.isActive
                          ? <Zap className="w-3.5 h-3.5 text-[#9FD8BD]" />
                          : <Zap className="w-3.5 h-3.5 text-[#93A096]" />
                        }
                      </span>
                      <div>
                        <h3 className="text-sm font-medium text-[#EEEAE0]">
                          {wh.name || "Unnamed Webhook"}
                        </h3>
                        <p className="text-xs text-[#93A096] truncate max-w-lg mt-0.5">
                          {wh.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {wh.events.map((evt) => (
                        <span
                          key={evt}
                          className="text-[10px] font-medium px-2 py-0.5 border bg-transparent text-[#A3D1DF] border-[#A3D1DF]/50"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>

                    {wh.lastTestedAt && (
                      <p className="text-[10px] text-[#93A096]">
                        Last tested: {new Date(wh.lastTestedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/workspaces/${workspaceId}/webhooks/${wh.id}`}
                      className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#A3D1DF] hover:border-[#A3D1DF]/40 transition-colors"
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
