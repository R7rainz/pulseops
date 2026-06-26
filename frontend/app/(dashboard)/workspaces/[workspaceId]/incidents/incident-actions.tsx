"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";

import { API_URL } from "@/lib/constants";
const API = API_URL;

function ToastMsg({
  message,
  type,
  onDone,
}: {
  message: string;
  type: "success" | "error";
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 border-2 px-5 py-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] max-w-sm ${
        type === "success"
          ? "bg-zinc-950 border-emerald-500/50"
          : "bg-zinc-950 border-red-500/50"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400" />
      )}
      <p className="text-sm text-zinc-200 font-mono flex-1">{message}</p>
    </div>
  );
}

export function IncidentActions({
  incidentId,
  workspaceId,
  status,
  canEdit = false,
}: {
  incidentId: number;
  workspaceId: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const callAction = useCallback(
    async (action: "acknowledge" | "resolve") => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { token } = await tokenRes.json();
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch(`${API}/api/v1/incidents/${incidentId}/${action}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          setToast({
            message:
              action === "acknowledge"
                ? "Incident acknowledged"
                : "Incident resolved",
            type: "success",
          });
        } else {
          const data = await res.json().catch(() => ({}));
          setToast({
            message: data.message || `Failed to ${action} incident`,
            type: "error",
          });
        }

        router.refresh();
      } catch {
        setToast({ message: "Network error", type: "error" });
      }
    },
    [incidentId, router],
  );

  return (
    <>
      {canEdit ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === "OPEN" && (
            <button
              type="button"
              onClick={() => callAction("acknowledge")}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-amber-500 text-zinc-400 hover:text-amber-400 text-xs font-bold uppercase tracking-widest transition-colors rounded-none"
            >
              ACKNOWLEDGE
            </button>
          )}
          <button
            type="button"
            onClick={() => callAction("resolve")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border-2 border-transparent text-zinc-950 text-xs font-bold uppercase tracking-widest transition-colors rounded-none"
          >
            MARK RESOLVED
          </button>
        </div>
      ) : (
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold border-2 border-zinc-800 px-3 py-2">
          Read-Only Access
        </span>
      )}

      {toast && (
        <ToastMsg
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}
