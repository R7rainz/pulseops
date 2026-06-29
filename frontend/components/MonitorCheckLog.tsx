"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/constants";
import type { MonitorCheck } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface Props {
  workspaceId: string;
  monitorId: number;
  token: string;
}

const PAGE_SIZE = 20;

export default function MonitorCheckLog({ workspaceId, monitorId, token }: Props) {
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchWithRefresh(url: string, currentToken: string): Promise<Response> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${currentToken}` } });
    if (res.status !== 401) return res;
    const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!refreshRes.ok) return res;
    const { data } = await refreshRes.json();
    const newToken = data?.accessToken as string | undefined;
    if (!newToken) return res;
    return fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
  }

  const fetchChecks = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/${monitorId}/checks?limit=${PAGE_SIZE}&offset=${currentOffset}`,
        token,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setChecks(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setChecks([]);
    } finally {
      setLoading(false);
    }
  }, [monitorId, workspaceId, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch toggles loading state on offset change
    fetchChecks(offset);
  }, [offset, fetchChecks]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="glass space-y-4 rounded-lg p-6">
      <h2 className="flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
        Check log
        {!loading && <span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground">{total} entries</span>}
      </h2>

      {error && (
        <div role="alert" className="rounded-lg border border-down/40 bg-down/10 py-3 text-center text-sm text-down">
          Couldn’t load checks — {error}
        </div>
      )}

      {loading && !error && (
        <div className="space-y-2 py-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-surface-raised" />
          ))}
        </div>
      )}

      {!loading && !error && checks.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">No checks recorded yet.</div>
      )}

      {checks.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">Time</th>
                  <th className="py-2 pr-4 text-left font-medium">Status</th>
                  <th className="py-2 pr-4 text-left font-medium">Code</th>
                  <th className="py-2 pr-4 text-left font-medium">Latency</th>
                  <th className="py-2 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {checks.map((check) => (
                  <tr key={check.id} className="transition-colors hover:bg-surface-raised/50">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                      {new Date(check.checkedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={check.status} size="sm" />
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-foreground">{check.statusCode ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-foreground">
                      {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "—"}
                    </td>
                    <td className="max-w-[200px] truncate py-2.5 text-muted-foreground">{check.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
