"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Crown, Zap, CheckCircle, XCircle, Loader2, Shield } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [planTier, setPlanTier] = useState<string>("FREE");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setWorkspaceId(p.workspaceId));
  }, [params]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchPlan();
  }, [workspaceId]);

  async function fetchPlan() {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      const res = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const json = await res.json();
        setPlanTier(json.data?.planTier || "FREE");
      }
    } catch {}
    setLoading(false);
  }

  async function handleUpgrade() {
    setCreating(true);
    setMessage(null);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      const subRes = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/subscription`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!subRes.ok) {
        setMessage("Failed to initialize checkout");
        setCreating(false);
        return;
      }

      const subData = await subRes.json();
      const { subscriptionId, key } = subData.data;

      // Load Razorpay checkout script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

      const options = {
        key,
        subscription_id: subscriptionId,
        name: "PulseOps",
        description: "Pro Plan — Monthly Subscription",
        image: "",
        handler: async function (response: any) {
          const verifyRes = await fetch(
            `${API_URL}/api/v1/workspaces/${workspaceId}/subscription/verify`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            },
          );

          if (verifyRes.ok) {
            setPlanTier("PRO");
            setMessage("Upgrade successful! You're now on Pro.");
          } else {
            setMessage("Payment verification failed.");
          }
        },
        modal: {
          ondismiss: function () {
            setCreating(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setMessage("Something went wrong. Please try again.");
    }
    setCreating(false);
  }

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/workspaces/${workspaceId}/monitors`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to monitors
        </Link>

        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Billing &amp; plan</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your subscription</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-xs font-medium text-up">
            <Shield className="h-3.5 w-3.5" /> Current: {planTier}
          </span>
        </div>

        {message && (
          <div role="status" className="glass rounded-lg p-4 text-sm text-foreground">{message}</div>
        )}

        {loading ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading plan…</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Free */}
            <div className={cn("glass rounded-lg p-6", planTier === "FREE" && "border-up/30")}>
              <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-4">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-display text-lg font-semibold text-foreground">Free</h2>
              </div>
              <p className="mb-5 font-display text-3xl font-semibold text-foreground">$0</p>
              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                <Feature ok>Up to 5 monitors</Feature>
                <Feature ok>60s check interval</Feature>
                <Feature ok>1 workspace</Feature>
                <Feature>SLA reports</Feature>
              </ul>
              {planTier === "FREE" && (
                <div className="rounded-full border border-border py-2.5 text-center text-xs font-medium text-muted-foreground">Current plan</div>
              )}
            </div>

            {/* Pro */}
            <div className={cn("rounded-lg p-6", planTier === "PRO" ? "border border-up/30 bg-up/[0.04]" : "glass")}>
              <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-4">
                <Crown className="h-5 w-5 text-degraded" />
                <h2 className="font-display text-lg font-semibold text-degraded">Pro</h2>
              </div>
              <p className="mb-5 font-display text-3xl font-semibold text-foreground">
                $10<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mb-6 space-y-2 text-sm text-foreground/90">
                <Feature ok>Unlimited monitors</Feature>
                <Feature ok>30s check interval</Feature>
                <Feature ok>Unlimited workspaces</Feature>
                <Feature ok>SLA reports &amp; analytics</Feature>
                <Feature ok>Priority support</Feature>
              </ul>
              {planTier === "PRO" ? (
                <div className="rounded-full border border-up/30 bg-up/10 py-2.5 text-center text-xs font-medium text-up">Active</div>
              ) : (
                <button onClick={handleUpgrade} disabled={creating} className="btn btn-primary w-full">
                  {creating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    <><Crown className="h-4 w-4" /> Upgrade to Pro</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Feature({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle className="h-3.5 w-3.5 text-up" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/60" />}
      {children}
    </li>
  );
}
