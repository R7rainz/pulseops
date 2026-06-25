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
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 border px-5 py-3.5 max-w-sm ${
        type === "success"
          ? "bg-transparent border-[#9FD8BD]/50"
          : "bg-transparent border-[#C2766B]/50"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4 text-[#9FD8BD]" />
      ) : (
        <AlertCircle className="w-4 h-4 text-[#C2766B]" />
      )}
      <p className="text-sm text-[#EEEAE0] flex-1">{message}</p>
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
              className="px-4 py-2 bg-[rgba(238,234,224,0.04)] hover:bg-[rgba(238,234,224,0.06)] border border-[rgba(238,234,224,0.06)] hover:border-[#E2A356] text-[#93A096] hover:text-[#E2A356] text-xs font-medium transition-colors rounded-[4px]"
            >
              Acknowledge
            </button>
          )}
          <button
            type="button"
            onClick={() => callAction("resolve")}
            className="px-4 py-2 bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 text-xs font-medium transition-colors rounded-[999px]"
          >
            Mark Resolved
          </button>
        </div>
      ) : (
        <span className="text-[10px] text-[#93A096] font-medium border border-[rgba(238,234,224,0.06)] px-3 py-2">
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
