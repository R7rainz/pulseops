"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  Shield,
  TerminalSquare,
} from "lucide-react";

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
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 hover:border-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Command Center
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-emerald-400" />
                Billing &{" "}
                <span className="text-emerald-400">Plan</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
                Manage your subscription and telemetry tier
              </p>
            </div>
            <div className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Current: {planTier}
            </div>
          </div>
        </div>

        {message && (
          <div className="p-4 bg-zinc-900 border-2 border-zinc-800 text-xs text-zinc-300 font-bold uppercase tracking-widest">
            {message}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold border-2 border-dashed border-zinc-800">
            Loading plan data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan Card */}
            <div className={`p-6 border-2 ${planTier === "FREE" ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950"} shadow-[4px_4px_0px_0px_rgba(255,255,255,0.02)]`}>
              <div className="flex items-center gap-3 mb-4 border-b-2 border-zinc-900 pb-4">
                <Zap className="w-6 h-6 text-zinc-500" />
                <h2 className="text-lg font-bold uppercase tracking-widest text-zinc-400">Free</h2>
              </div>
              <p className="text-3xl font-black text-zinc-500 mb-4">$0</p>
              <ul className="space-y-2 text-xs text-zinc-500 mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-zinc-600" /> Up to 5 monitors</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-zinc-600" /> 60s ping interval</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-zinc-600" /> 1 workspace</li>
                <li className="flex items-center gap-2"><XCircle className="w-3.5 h-3.5 text-zinc-700" /> No SLA reports</li>
              </ul>
              {planTier === "FREE" && (
                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-2 border-zinc-800 py-3">
                  Current Plan
                </div>
              )}
            </div>

            {/* Pro Plan Card */}
            <div className={`p-6 border-2 ${planTier === "PRO" ? "border-emerald-700 bg-emerald-950/10 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.1)]" : "border-zinc-800 bg-zinc-950 hover:border-emerald-800 transition-colors shadow-[4px_4px_0px_0px_rgba(52,211,153,0.03)]"}`}>
              <div className="flex items-center gap-3 mb-4 border-b-2 border-zinc-900 pb-4">
                <Crown className="w-6 h-6 text-amber-400" />
                <h2 className="text-lg font-bold uppercase tracking-widest text-amber-400">Pro</h2>
              </div>
              <p className="text-3xl font-black text-amber-400 mb-4">$10<span className="text-sm text-zinc-600 font-bold">/mo</span></p>
              <ul className="space-y-2 text-xs text-zinc-400 mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Unlimited monitors</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 30s ping interval</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Unlimited workspaces</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> SLA reports & analytics</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Priority support</li>
              </ul>
              {planTier === "PRO" ? (
                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 border-2 border-emerald-800 py-3">
                  Active
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={creating}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold uppercase tracking-widest py-3 text-xs border-2 border-transparent transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Crown className="w-4 h-4" /> Upgrade to Pro</>
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
