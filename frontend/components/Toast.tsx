"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { ToastData } from "@/lib/toast";
import { TOAST_COOKIE, CLEAR_TOAST_HEADER } from "@/lib/toast";

function getToastCookie(): ToastData | null {
  const match = document.cookie.match(new RegExp(`(^| )${TOAST_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[2]));
  } catch {
    return null;
  }
}

function clearToastCookie() {
  document.cookie = CLEAR_TOAST_HEADER;
}

export default function Toast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      setToast(null);
      setLeaving(false);
      clearToastCookie();
    }, 300);
  }, []);

  useEffect(() => {
    const data = getToastCookie();
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- surfacing a toast persisted in a cookie on mount
      setToast(data);
      const timer = setTimeout(dismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [dismiss]);

  if (!toast) return null;

  const icon =
    toast.type === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-up" />
    ) : toast.type === "error" ? (
      <AlertCircle className="h-4 w-4 text-down" />
    ) : (
      <Info className="h-4 w-4 text-info" />
    );

  return (
    <div
      role="status"
      aria-live="polite"
      className={`glass fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ${
        leaving ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      {icon}
      <p className="flex-1 text-sm text-foreground">{toast.message}</p>
      <button onClick={dismiss} className="p-0.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
