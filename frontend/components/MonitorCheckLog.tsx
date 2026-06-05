"use client";

import { useState, useEffect, useCallback } from "react";
import type { MonitorCheck } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  monitorId: number;
  token: string;
}

const PAGE_SIZE = 20;

export default function MonitorCheckLog({ monitorId, token }: Props) {
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchWithRefresh(url: string, currentToken: string): Promise<Response> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${currentToken}` } });
    if (res.status !== 401) return res;
    const refreshRes = await fetch("http://127.0.0.1:4000/api/v1/auth/refresh", {
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
        `http://127.0.0.1:4000/api/v1/monitors/${monitorId}/checks?limit=${PAGE_SIZE}&offset=${currentOffset}`,
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
  }, [monitorId]);

  useEffect(() => {
    fetchChecks(offset);
  }, [offset, fetchChecks]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-6 border-2 border-zinc-900 bg-zinc-950 space-y-4">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
        Probe Log
        {!loading && (
          <span className="text-[10px] text-zinc-600 font-normal ml-auto">{total} entries</span>
        )}
      </h2>

      {error && (
        <div className="py-4 text-center text-red-400 text-[10px] uppercase tracking-widest font-bold">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="py-8 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
          Loading probe data...
        </div>
      )}

      {!loading && !error && checks.length === 0 && (
        <div className="py-8 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
          No probe data recorded yet.
        </div>
      )}

      {checks.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-zinc-900 text-zinc-500 uppercase tracking-widest text-[10px]">
                  <th className="text-left py-2 pr-4 font-bold">Time</th>
                  <th className="text-left py-2 pr-4 font-bold">Status</th>
                  <th className="text-left py-2 pr-4 font-bold">Code</th>
                  <th className="text-left py-2 pr-4 font-bold">Latency</th>
                  <th className="text-left py-2 font-bold">Error</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">
                      {new Date(check.checkedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`font-bold ${
                        check.status === "UP" ? "text-emerald-400" :
                        check.status === "DEGRADED" ? "text-amber-400" :
                        "text-red-400"
                      }`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-300">
                      {check.statusCode ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-zinc-300">
                      {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "—"}
                    </td>
                    <td className="py-2 text-zinc-500 max-w-[200px] truncate">
                      {check.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t-2 border-zinc-900">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="flex items-center gap-1 px-3 py-1.5 border-2 border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 hover:border-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3 h-3" /> Previous
                </button>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="flex items-center gap-1 px-3 py-1.5 border-2 border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 hover:border-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
