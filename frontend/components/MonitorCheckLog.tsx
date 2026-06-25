"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/constants";
import type { MonitorCheck } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  }, [monitorId]);

  useEffect(() => {
    fetchChecks(offset);
  }, [offset, fetchChecks]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="glass rounded-[9px] p-[12px] space-y-4">
      <h2 className="text-sm font-medium text-[#93A096] flex items-center gap-2 border-b border-[rgba(238,234,224,0.06)] pb-2">
        Probe Log
        {!loading && (
          <span className="text-body-md text-[#93A096]/60 font-normal ml-auto">{total} entries</span>
        )}
      </h2>

      {error && (
        <div className="py-4 text-center text-[#C2766B] text-body-md font-medium">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="py-8 text-center text-[#93A096]/60 text-body-md font-medium">
          Loading probe data...
        </div>
      )}

      {!loading && !error && checks.length === 0 && (
        <div className="py-8 text-center text-[#93A096]/60 text-body-md font-medium">
          No probe data recorded yet.
        </div>
      )}

      {checks.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(238,234,224,0.06)] text-[#93A096] text-body-md">
                  <th className="text-left py-2 pr-4 font-medium">Time</th>
                  <th className="text-left py-2 pr-4 font-medium">Status</th>
                  <th className="text-left py-2 pr-4 font-medium">Code</th>
                  <th className="text-left py-2 pr-4 font-medium">Latency</th>
                  <th className="text-left py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id} className="border-b border-[rgba(238,234,224,0.04)] hover:bg-[rgba(238,234,224,0.02)] transition-colors">
                    <td className="py-2 pr-4 text-[#93A096] whitespace-nowrap">
                      {new Date(check.checkedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`font-medium ${
                        check.status === "UP" ? "text-[#9FD8BD]" :
                        check.status === "DEGRADED" ? "text-[#E2A356]" :
                        "text-[#C2766B]"
                      }`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-[#EEEAE0]">
                      {check.statusCode ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-[#EEEAE0]">
                      {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "—"}
                    </td>
                    <td className="py-2 text-[#93A096] max-w-[200px] truncate">
                      {check.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(238,234,224,0.06)]">
              <span className="text-body-md text-[#93A096]/60 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-body-md font-medium text-[#93A096] hover:text-[#EEEAE0] hover:border-[rgba(238,234,224,0.2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3 h-3" /> Previous
                </button>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-body-md font-medium text-[#93A096] hover:text-[#EEEAE0] hover:border-[rgba(238,234,224,0.2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
