"use client";

import { useState } from "react";
import Image from "next/image";
import { API_URL } from "@/lib/constants";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, Copy } from "lucide-react";

type Phase = "idle" | "enrolling" | "recovery";

// Fetches the bearer token from the httpOnly-cookie bridge, calls the backend,
// and transparently refreshes once on 401 before giving up.
async function authedFetch(path: string, body?: unknown): Promise<Response> {
  async function call(token: string | null) {
    return fetch(`${API_URL}/api/v1/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
  }

  const { token } = await fetch("/api/auth/token").then((r) => r.json());
  let res = await call(token);
  if (res.status === 401 || res.status === 403) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      const { token: newToken } = await refreshed.json();
      res = await call(newToken);
    }
  }
  return res;
}

export default function TwoFactorSection({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function beginSetup() {
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch("/2fa/setup");
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Could not start setup.");
        return;
      }
      setQrCode(json.data.qrCode);
      setSecret(json.data.secret);
      setPhase("enrolling");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch("/2fa/enable", { secret, code });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Invalid code.");
        return;
      }
      setRecoveryCodes(json.data.recoveryCodes);
      setEnabled(true);
      setPhase("recovery");
      setCode("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch("/2fa/disable", { code });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Invalid code.");
        return;
      }
      setEnabled(false);
      setPhase("idle");
      setCode("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass mb-6 rounded-lg p-6">
      <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        {enabled ? <ShieldCheck className="h-4 w-4 text-up" /> : <ShieldAlert className="h-4 w-4 text-degraded" />}
        Two-factor authentication
      </h2>
      <p className="mb-5 text-xs text-muted-foreground">
        {enabled
          ? "Two-factor authentication is active on your account."
          : "Add a second factor with an authenticator app (Google Authenticator, Authy, 1Password…)."}
      </p>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Recovery codes shown once right after enabling */}
      {phase === "recovery" && (
        <div>
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-up/40 bg-up/10 p-3 text-sm text-up">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Two-factor is enabled. Save these recovery codes somewhere safe — each works once if you lose your device. They won’t be shown again.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background/40 p-4 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <span key={c} className="text-foreground">{c}</span>
            ))}
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}
            className="btn btn-ghost mt-3 inline-flex items-center gap-2"
          >
            <Copy className="h-3.5 w-3.5" /> Copy codes
          </button>
          <div className="mt-4">
            <button onClick={() => setPhase("idle")} className="btn btn-primary">Done</button>
          </div>
        </div>
      )}

      {/* Enrolment: QR + confirm code */}
      {phase === "enrolling" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
          {qrCode && (
            <Image src={qrCode} alt="Two-factor QR code" width={176} height={176} className="rounded-lg border border-border bg-white p-2" unoptimized />
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Can’t scan? Enter this key manually</summary>
            <code className="mt-1 block break-all font-mono text-foreground">{secret}</code>
          </details>
          <div className="space-y-1.5">
            <label htmlFor="totp-enable" className="block text-sm font-medium text-foreground">Verification code</label>
            <input
              id="totp-enable"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="field max-w-[200px] tracking-[0.3em]"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={confirmEnable} disabled={busy || code.length < 6} className="btn btn-primary">
              {busy ? "Verifying…" : "Enable 2FA"}
            </button>
            <button onClick={() => { setPhase("idle"); setError(""); setCode(""); }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Idle: enable or disable entry point */}
      {phase === "idle" && (
        enabled ? (
          <DisableForm code={code} setCode={setCode} busy={busy} onDisable={disable} />
        ) : (
          <button onClick={beginSetup} disabled={busy} className="btn btn-primary">
            {busy ? "Starting…" : "Enable two-factor"}
          </button>
        )
      )}
    </div>
  );
}

function DisableForm({
  code,
  setCode,
  busy,
  onDisable,
}: {
  code: string;
  setCode: (v: string) => void;
  busy: boolean;
  onDisable: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn btn-danger">Disable two-factor</button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="totp-disable" className="block text-sm font-medium text-foreground">
          Enter a current code or recovery code to disable
        </label>
        <input
          id="totp-disable"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          placeholder="123456"
          className="field max-w-[220px] tracking-[0.2em]"
        />
      </div>
      <div className="flex gap-3">
        <button onClick={onDisable} disabled={busy || code.length < 6} className="btn btn-danger">
          {busy ? "Disabling…" : "Confirm disable"}
        </button>
        <button onClick={() => setConfirming(false)} className="btn btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
