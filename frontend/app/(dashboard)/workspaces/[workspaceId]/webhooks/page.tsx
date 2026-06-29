import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { ArrowLeft, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href={`/workspaces/${workspaceId}/monitors`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to monitors
        </Link>

        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Webhooks</h1>
            <p className="mt-1 text-sm text-muted-foreground">{workspaceName || `Workspace #${workspaceId}`} · alerts via HTTP POST</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="rounded-full border border-border px-3 py-1.5 text-muted-foreground">{webhooks.length} total</span>
            <span className="rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-up">
              {webhooks.filter((w) => w.isActive).length} active
            </span>
          </div>
        </div>

        {canEdit && <CreateWebhookForm workspaceId={workspaceId} />}

        {webhooks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-sm font-medium text-foreground">No webhooks configured</p>
            {canEdit && <p className="mt-1 text-sm text-muted-foreground">Add one above to receive incident alerts.</p>}
          </div>
        ) : (
          <div className="glass divide-y divide-border overflow-hidden rounded-lg">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-start justify-between gap-4 p-5 transition-colors hover:bg-surface-raised/40">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border", wh.isActive ? "border-up/30 bg-up/10" : "border-border")}>
                      <Zap className={cn("h-4 w-4", wh.isActive ? "text-up" : "text-muted-foreground")} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-medium text-foreground">{wh.name || "Unnamed webhook"}</h3>
                      <p className="mt-0.5 max-w-lg truncate font-mono text-xs text-muted-foreground">{wh.url}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {wh.events.map((evt) => (
                      <span key={evt} className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info">
                        {evt}
                      </span>
                    ))}
                  </div>

                  {wh.lastTestedAt && (
                    <p className="font-mono text-[11px] text-muted-foreground">Last tested {new Date(wh.lastTestedAt).toLocaleString()}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/workspaces/${workspaceId}/webhooks/${wh.id}`}
                    className="icon-btn hover:border-info/40 hover:text-info"
                    title="Delivery logs"
                    aria-label="Delivery logs"
                  >
                    <FileText className="h-4 w-4" />
                  </Link>
                  {canEdit && <WebhookActions webhookId={wh.id} workspaceId={workspaceId} isActive={wh.isActive} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
