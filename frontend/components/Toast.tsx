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
      setToast(data);
      const timer = setTimeout(dismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [dismiss]);

  if (!toast) return null;

  const icon =
    toast.type === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    ) : toast.type === "error" ? (
      <AlertCircle className="w-4 h-4 text-red-400" />
    ) : (
      <Info className="w-4 h-4 text-cyan-400" />
    );

  return (
    <div className="fixed top-4 right-4 z-[100] flex items-start gap-3 bg-zinc-950 border-2 border-zinc-800 px-5 py-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] max-w-sm">
      {icon}
      <p className="text-sm text-zinc-200 font-mono flex-1">{toast.message}</p>
      <button
        onClick={dismiss}
        className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
