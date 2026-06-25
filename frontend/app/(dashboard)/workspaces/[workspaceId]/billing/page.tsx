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
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-[rgba(238,234,224,0.1)] text-label-md font-medium text-[#93A096] hover:text-[#A3D1DF] hover:border-[rgba(163,209,223,0.3)] transition-colors rounded-[999px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Command Center
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(238,234,224,0.06)] pb-6">
            <div>
              <h1 className="text-3xl font-medium text-[#EEEAE0] flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-[#9FD8BD]" />
                Billing &{" "}
                <span className="text-[#9FD8BD]">Plan</span>
              </h1>
              <p className="text-body-md text-[#93A096] mt-2 font-medium">
                Manage your subscription and telemetry tier
              </p>
            </div>
            <div className="px-4 py-2 border border-[rgba(159,216,189,0.2)] text-label-md font-medium text-[#9FD8BD] rounded-[4px] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Current: {planTier}
            </div>
          </div>
        </div>

        {message && (
          <div className="p-4 glass rounded-[9px] text-body-md text-[#EEEAE0] font-medium">
            {message}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-[#93A096]/60 text-body-md font-medium border border-dashed border-[rgba(238,234,224,0.1)] rounded-[9px]">
            Loading plan data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan Card */}
            <div className={`glass rounded-[9px] p-[18px] ${planTier === "FREE" ? "border-[rgba(238,234,224,0.15)]" : ""}`}>
              <div className="flex items-center gap-3 mb-4 border-b border-[rgba(238,234,224,0.06)] pb-4">
                <Zap className="w-6 h-6 text-[#93A096]" />
                <h2 className="text-lg font-medium text-[#93A096]">Free</h2>
              </div>
              <p className="text-3xl font-medium text-[#93A096] mb-4">$0</p>
              <ul className="space-y-2 text-body-md text-[#93A096] mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#93A096]" /> Up to 5 monitors</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#93A096]" /> 60s ping interval</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#93A096]" /> 1 workspace</li>
                <li className="flex items-center gap-2"><XCircle className="w-3.5 h-3.5 text-[#93A096]/40" /> No SLA reports</li>
              </ul>
              {planTier === "FREE" && (
                <div className="text-center text-label-md font-medium text-[#93A096]/60 border border-[rgba(238,234,224,0.08)] rounded-[4px] py-3">
                  Current Plan
                </div>
              )}
            </div>

            {/* Pro Plan Card */}
            <div className={`glass rounded-[9px] p-[18px] ${planTier === "PRO" ? "border-[#9FD8BD]/40" : "hover:border-[#9FD8BD]/30 transition-colors"}`}>
              <div className="flex items-center gap-3 mb-4 border-b border-[rgba(238,234,224,0.06)] pb-4">
                <Crown className="w-6 h-6 text-[#E2A356]" />
                <h2 className="text-lg font-medium text-[#E2A356]">Pro</h2>
              </div>
              <p className="text-3xl font-medium text-[#E2A356] mb-4">$10<span className="text-body-md text-[#93A096] font-medium">/mo</span></p>
              <ul className="space-y-2 text-body-md text-[#93A096] mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#9FD8BD]" /> Unlimited monitors</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#9FD8BD]" /> 30s ping interval</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#9FD8BD]" /> Unlimited workspaces</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#9FD8BD]" /> SLA reports & analytics</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[#9FD8BD]" /> Priority support</li>
              </ul>
              {planTier === "PRO" ? (
                <div className="text-center text-label-md font-medium text-[#9FD8BD] border border-[#9FD8BD]/40 rounded-[4px] py-3">
                  Active
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={creating}
                  className="w-full bg-[#E2A356] hover:bg-[#E2A356]/90 text-[#0A0F0C] rounded-[999px] py-3 border-0 transition-all disabled:opacity-50 text-label-md font-medium flex items-center justify-center gap-2"
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
