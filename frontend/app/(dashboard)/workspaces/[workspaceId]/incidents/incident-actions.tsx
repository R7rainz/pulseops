"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
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
      role="status"
      aria-live="polite"
      className={`glass fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
        type === "success" ? "border-up/40" : "border-down/40"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-up" />
      ) : (
        <AlertCircle className="h-4 w-4 text-down" />
      )}
      <p className="flex-1 text-sm text-foreground">{message}</p>
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
        <div className="flex shrink-0 items-center gap-2">
          {status === "OPEN" && (
            <button
              type="button"
              onClick={() => callAction("acknowledge")}
              className="btn btn-ghost hover:border-degraded/40 hover:text-degraded"
            >
              Acknowledge
            </button>
          )}
          <button type="button" onClick={() => callAction("resolve")} className="btn btn-accent">
            <ShieldCheck className="h-4 w-4" />
            Resolve
          </button>
        </div>
      ) : (
        <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Read-only
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
