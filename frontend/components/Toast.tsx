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
      <CheckCircle2 className="w-4 h-4 text-[#9FD8BD]" />
    ) : toast.type === "error" ? (
      <AlertCircle className="w-4 h-4 text-[#C2766B]" />
    ) : (
      <Info className="w-4 h-4 text-[#A3D1DF]" />
    );

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-start gap-3 glass rounded-[9px] px-5 py-3.5 max-w-sm transition-all duration-[300ms] ${leaving ? "opacity-0 translate-y-[-8px]" : "opacity-100 translate-y-0"}`}>
      {icon}
      <p className="text-sm text-[#EEEAE0] flex-1">{toast.message}</p>
      <button
        onClick={dismiss}
        className="p-0.5 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
