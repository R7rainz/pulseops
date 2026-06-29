import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

interface DeliveryLog {
  id: number;
  webhookId: number;
  url: string;
  requestPayload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  isSuccess: boolean;
  createdAt: string;
}

interface PaginatedResult {
  logs: DeliveryLog[];
  total: number;
  skip: number;
  take: number;
}

const PAGE_SIZE = 20;

export default async function WebhookDeliveryLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; webhookId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { workspaceId, webhookId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) redirect("/login");

  let result: PaginatedResult | null = null;
  let webhookName = "";

  try {
    const [logsRes, hooksRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/delivery-logs?skip=${skip}&take=${PAGE_SIZE}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/webhooks`,
        { token, cookieStore, cache: "no-store" },
      ),
    ]);

    if (logsRes.ok) {
      const data = await logsRes.json();
      result = data.data || null;
    }

    if (hooksRes.ok) {
      const data = await hooksRes.json();
      const hooks: { id: number; name: string; url: string }[] = data.data || [];
      const found = hooks.find((h) => h.id === Number(webhookId));
      if (found) webhookName = found.name || found.url;
    }

    if (logsRes.status === 401 || logsRes.status === 403) {
      redirect("/login");
    }
  } catch (err) {
    console.error("Failed to load webhook delivery logs:", err);
  }

  const logs = result?.logs || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const successCount = logs.filter((l) => l.isSuccess).length;
  const failCount = logs.length - successCount;

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/workspaces/${workspaceId}/webhooks`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to webhooks
        </Link>

        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Delivery logs</h1>
            <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground">{webhookName || `Webhook #${webhookId}`}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-up">{successCount} delivered</span>
            <span className="rounded-full border border-down/30 bg-down/10 px-3 py-1.5 text-down">{failCount} failed</span>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No delivery logs for this endpoint yet.
          </div>
        ) : (
          <div className="glass overflow-x-auto rounded-lg">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Time</th>
                  <th className="px-5 py-3 text-left font-medium">URL</th>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top transition-colors hover:bg-surface-raised/40">
                    <td className="px-5 py-3.5">
                      {log.isSuccess ? <CheckCircle className="h-5 w-5 text-up" /> : <XCircle className="h-5 w-5 text-down" />}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="max-w-[280px] px-5 py-3.5"><span className="block truncate font-mono text-xs text-foreground/80">{log.url}</span></td>
                    <td className="px-5 py-3.5">
                      <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px]", log.isSuccess ? "border-up/30 bg-up/10 text-up" : "border-down/30 bg-down/10 text-down")}>
                        {log.responseStatus ?? "N/A"}
                      </span>
                    </td>
                    <td className="min-w-0 px-5 py-3.5"><ExpandoBlock payload={log.requestPayload} body={log.responseBody} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            {page > 1 && (
              <Link href={`/workspaces/${workspaceId}/webhooks/${webhookId}?page=${page - 1}`} className="btn btn-ghost px-3 py-1.5 text-xs">
                Previous
              </Link>
            )}
            <span className="font-mono text-xs text-muted-foreground">{page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={`/workspaces/${workspaceId}/webhooks/${webhookId}?page=${page + 1}`} className="btn btn-ghost px-3 py-1.5 text-xs">
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ExpandoBlock({ payload, body }: { payload: Record<string, unknown>; body: string | null }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">
        <Eye className="h-3 w-3 group-open:hidden" />
        <EyeOff className="hidden h-3 w-3 group-open:block" />
        Inspect
      </summary>
      <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface-raised p-3 font-mono text-[10px] text-muted-foreground">
        <div>
          <span className="font-medium uppercase tracking-wider text-foreground/70">Request</span>
          <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
        </div>
        {body && (
          <div>
            <span className="font-medium uppercase tracking-wider text-foreground/70">Response</span>
            <pre className="mt-1 whitespace-pre-wrap">{body}</pre>
          </div>
        )}
      </div>
    </details>
  );
}
