import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { ArrowLeft, Zap, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

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
        `${API_URL}/api/v1/webhooks/${webhookId}/delivery-logs?skip=${skip}&take=${PAGE_SIZE}`,
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
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        <div>
          <Link
            href={`/workspaces/${workspaceId}/webhooks`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Webhooks
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
                <Zap className="w-8 h-8 text-cyan-400" />
                Delivery <span className="text-cyan-400">Logs</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold truncate max-w-xl">
                {webhookName || `Webhook #${webhookId}`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
              <span className="px-3 py-1.5 bg-emerald-950/30 border border-emerald-800 text-emerald-400">
                {successCount} Delivered
              </span>
              <span className="px-3 py-1.5 bg-red-950/30 border border-red-800 text-red-400">
                {failCount} Failed
              </span>
              <span className="text-zinc-500">
                Page {page}/{totalPages}
              </span>
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-zinc-800 bg-zinc-950 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">
            No delivery logs recorded for this endpoint.
          </div>
        ) : (
          <div className="border-2 border-zinc-800 bg-zinc-950 overflow-x-auto">
            <div className="min-w-[1000px] grid grid-cols-12 gap-4 px-6 py-4 border-b-2 border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Timestamp</div>
              <div className="col-span-4">Target URL</div>
              <div className="col-span-1">Code</div>
              <div className="col-span-4">Response</div>
            </div>

            <div className="min-w-[1000px] divide-y-2 divide-zinc-900">
              {logs.map((log) => (
                <div key={log.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-900/50 transition-colors group">
                  <div className="col-span-1">
                    {log.isSuccess ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  <div className="col-span-2 text-xs text-zinc-400 font-bold">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>

                  <div className="col-span-4 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{log.url}</p>
                  </div>

                  <div className="col-span-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                      log.isSuccess
                        ? "text-emerald-400 border-emerald-800 bg-emerald-950/20"
                        : "text-red-400 border-red-800 bg-red-950/20"
                    }`}>
                      {log.responseStatus ?? "N/A"}
                    </span>
                  </div>

                  <div className="col-span-4 min-w-0">
                    <ExpandoBlock payload={log.requestPayload} body={log.responseBody} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={`/workspaces/${workspaceId}/webhooks/${webhookId}?page=${page - 1}`}
                className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-xs text-zinc-500 font-bold">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/workspaces/${workspaceId}/webhooks/${webhookId}?page=${page + 1}`}
                className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ExpandoBlock({
  payload,
  body,
}: {
  payload: Record<string, unknown>;
  body: string | null;
}) {
  return (
    <details className="group">
      <summary className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest font-bold cursor-pointer list-none flex items-center gap-2">
        <Eye className="w-3 h-3 group-open:hidden" />
        <EyeOff className="w-3 h-3 hidden group-open:block" />
        Inspect Payload
      </summary>
      <div className="mt-2 p-3 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 space-y-2 max-h-48 overflow-y-auto">
        <div>
          <span className="text-zinc-600 uppercase tracking-widest font-bold">Request:</span>
          <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
        </div>
        {body && (
          <div>
            <span className="text-zinc-600 uppercase tracking-widest font-bold">Response:</span>
            <pre className="mt-1 whitespace-pre-wrap">{body}</pre>
          </div>
        )}
      </div>
    </details>
  );
}
