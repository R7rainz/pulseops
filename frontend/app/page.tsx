import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/constants";
import {
  Activity,
  Terminal,
  ArrowRight,
  Radio,
  Gauge,
  Timer,
  Bell,
  Globe,
  BarChart3,
  Siren,
  Webhook,
  Server,
  Workflow,
  GitPullRequest,
  Quote,
} from "lucide-react";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  let destination: string | null = null;

  if (token) {
    try {
      const res = await fetch(`${API_URL}/api/v1/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const workspaces = data.data || [];
        destination =
          workspaces.length > 0
            ? `/workspaces/${workspaces[0].id}/monitors`
            : "/workspaces/new";
      } else if (res.status === 401) {
        redirect("/api/auth/logout");
      }
    } catch (error) {
      if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error("Router fetch failed:", error);
    }
  }

  if (destination) {
    redirect(destination);
  }

  return (
    <div className="relative min-h-screen overflow-hidden selection:bg-[#9FD8BD]/20 selection:text-[#9FD8BD]">
      {/* N A V */}
      <nav className="glass border-b border-[rgba(238,234,224,0.08)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px]">
              <Activity className="w-5 h-5 text-[#9FD8BD]" />
            </div>
            <span className="font-medium text-lg tracking-wider text-[#EEEAE0]">
              Pulse<span className="text-[#9FD8BD]">Ops</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-label-md text-[#93A096] hover:text-[#EEEAE0] transition-colors font-medium"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2 bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] text-label-md font-medium border-0 transition-all"
            >
              Deploy Now
            </Link>
          </div>
        </div>
      </nav>

      {/* H E R O */}
      <section className="relative border-b border-[rgba(238,234,224,0.08)]">
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-28 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 glass rounded-[999px] text-[#9FD8BD] text-body-md font-medium mb-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9FD8BD] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9FD8BD]" />
            </span>
            v1.0 — Kafka Pipeline &bull; Redis Cache &bull; BullMQ Workers
          </div>

          <h1 className="text-display-lg mb-6 max-w-4xl mx-auto leading-none text-[#EEEAE0]">
            Strict Telemetry.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#9FD8BD] via-[#E2A356] to-[#A3D1DF]">
              Zero Bloat.
            </span>
          </h1>

          <p className="text-body-md text-[#93A096] max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Developer-first uptime monitoring with incident management,
            <br />
            Kafka-driven scheduling, real-time webhook alerts, and public status pages.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-3 px-8 py-4 bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] text-label-md font-medium transition-all"
            >
              Initialize Setup
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-[#93A096] hover:text-[#EEEAE0] hover:border-[rgba(238,234,224,0.2)] text-label-md font-medium transition-all"
            >
              <Terminal className="w-4 h-4" />
              Read Docs
            </a>
          </div>

          {/* LIVE METRICS BAR */}
          <div className="mt-20 max-w-3xl mx-auto grid grid-cols-3 gap-0 glass rounded-[9px] overflow-hidden">
            <div className="p-5 border-r border-[rgba(238,234,224,0.06)]">
              <p className="text-[10px] text-[#93A096] font-medium mb-1">Avg Latency</p>
              <p className="text-lg font-medium text-[#9FD8BD] flex items-center gap-2">
                <Timer className="w-4 h-4" />
                &lt;12ms
              </p>
            </div>
            <div className="p-5 border-r border-[rgba(238,234,224,0.06)]">
              <p className="text-[10px] text-[#93A096] font-medium mb-1">Uptime SLA</p>
              <p className="text-lg font-medium text-[#9FD8BD] flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                99.97%
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] text-[#93A096] font-medium mb-1">Nodes Tracked</p>
              <p className="text-lg font-medium text-[#9FD8BD] flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Unlimited
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* F E A T U R E S */}
      <section id="features" className="border-b border-[rgba(238,234,224,0.08)] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-sm font-medium text-[#93A096] mb-3">Core Capabilities</h2>
            <p className="text-2xl md:text-3xl font-medium text-[#EEEAE0]">
              Engineered for <span className="text-[#9FD8BD]">Precision</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="gradient-border-shell group">
              <div className="shell-inner p-[16px] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <div className="w-12 h-12 bg-[rgba(163,209,223,0.1)] border border-[rgba(163,209,223,0.2)] rounded-[4px] flex items-center justify-center mb-6 group-hover:border-[#A3D1DF]/40 transition-colors">
                  <Server className="w-5 h-5 text-[#A3D1DF]" />
                </div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  Kafka Pipeline
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed">
                  Monitor dispatch flows through Kafka topics. Go worker pool
                  executes probes — decoupled, scalable, resilient.
                </p>
              </div>
            </div>

            <div className="gradient-border-shell group">
              <div className="shell-inner p-[16px] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <div className="w-12 h-12 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] flex items-center justify-center mb-6 group-hover:border-[#9FD8BD]/40 transition-colors">
                  <Activity className="w-5 h-5 text-[#9FD8BD]" />
                </div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  Real-Time Dashboard
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed">
                  SWR-driven live metrics with Redis cache layer. Monitor status,
                  latency histograms, and uptime heatmaps update in real time.
                </p>
              </div>
            </div>

            <div className="gradient-border-shell group">
              <div className="shell-inner p-[16px] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <div className="w-12 h-12 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.2)] rounded-[4px] flex items-center justify-center mb-6 group-hover:border-[#C2766B]/40 transition-colors">
                  <Siren className="w-5 h-5 text-[#C2766B]" />
                </div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  Incident Management
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed">
                  Automatic incident creation on threshold breach. Full timeline
                  with acknowledge/resolve workflow and probe context.
                </p>
              </div>
            </div>

            <div className="gradient-border-shell group">
              <div className="shell-inner p-[16px] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <div className="w-12 h-12 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] flex items-center justify-center mb-6 group-hover:border-[#9FD8BD]/40 transition-colors">
                  <Bell className="w-5 h-5 text-[#9FD8BD]" />
                </div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  Webhook Alerts
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed">
                  Fire webhook notifications on status changes. Delivery logs,
                  retry logic, and per-endpoint configuration.
                </p>
              </div>
            </div>

            <div className="gradient-border-shell group">
              <div className="shell-inner p-[16px] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <div className="w-12 h-12 bg-[rgba(163,209,223,0.1)] border border-[rgba(163,209,223,0.2)] rounded-[4px] flex items-center justify-center mb-6 group-hover:border-[#A3D1DF]/40 transition-colors">
                  <Globe className="w-5 h-5 text-[#A3D1DF]" />
                </div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  Public Status Pages
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed">
                  Shareable status pages with 90-day uptime heatmap, live monitor
                  states, and incident history.
                </p>
              </div>
            </div>

            <div className="gradient-border-shell group">
              <div className="shell-inner p-[16px] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <div className="w-12 h-12 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.2)] rounded-[4px] flex items-center justify-center mb-6 group-hover:border-[#C2766B]/40 transition-colors">
                  <BarChart3 className="w-5 h-5 text-[#C2766B]" />
                </div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  SSL &amp; TLS Monitoring
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed">
                  Automatic SSL certificate inspection with expiry alerts.
                  Degraded state triggers separate incident threads.
                </p>
              </div>
            </div>
          </div>

          {/* ARCHITECTURE HIGHLIGHT */}
          <div className="mt-16 glass rounded-[9px] p-[29.6px]">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-14 h-14 bg-[rgba(163,209,223,0.1)] border border-[rgba(163,209,223,0.2)] rounded-[4px] flex items-center justify-center shrink-0">
                <Workflow className="w-6 h-6 text-[#A3D1DF]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#EEEAE0] mb-3">
                  Pipeline Architecture
                </h3>
                <p className="text-body-md text-[#93A096] leading-relaxed mb-4">
                  Kafka dispatches monitor checks to a dedicated Go worker pool
                  for parallel execution. Results flow through BullMQ queues for
                  incident evaluation, webhook delivery, and alert processing.
                  Redis caches live metrics for sub-millisecond dashboard reads.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.1)] rounded-[4px] text-[10px] text-[#93A096] font-medium">Kafka</span>
                  <span className="px-3 py-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.1)] rounded-[4px] text-[10px] text-[#93A096] font-medium">Go Workers</span>
                  <span className="px-3 py-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.1)] rounded-[4px] text-[10px] text-[#93A096] font-medium">BullMQ</span>
                  <span className="px-3 py-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.1)] rounded-[4px] text-[10px] text-[#93A096] font-medium">Redis</span>
                  <span className="px-3 py-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.1)] rounded-[4px] text-[10px] text-[#93A096] font-medium">Fastify</span>
                  <span className="px-3 py-1 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.1)] rounded-[4px] text-[10px] text-[#93A096] font-medium">PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* R O A D M A P   +   T E S T I M O N I A L */}
      <section className="border-b border-[rgba(238,234,224,0.08)] py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Roadmap */}
          <div>
            <h2 className="text-xl font-medium text-[#EEEAE0] mb-8 flex items-center gap-3">
              <GitPullRequest className="w-6 h-6 text-[#A3D1DF]" />
              System Roadmap
            </h2>
            <div className="space-y-8 border-l border-[rgba(238,234,224,0.1)] pl-8 relative">
              <div className="absolute w-3 h-3 bg-[#9FD8BD] rounded-[4px] -left-[6.5px] top-1.5" />
              <div>
                <h4 className="text-[#9FD8BD] font-medium text-xs mb-1">
                  Q3 2026
                </h4>
                <p className="text-[#EEEAE0] font-medium text-sm">
                  Multi-Region Ping Grid
                </p>
                <p className="text-[#93A096] text-body-md mt-1.5 leading-relaxed">
                  Dispatch probes from US-East, EU-Central, and AP-South
                  concurrently for global latency coverage.
                </p>
              </div>

              <div className="absolute w-3 h-3 bg-[rgba(238,234,224,0.15)] rounded-[4px] -left-[6.5px] top-[7.5rem]" />
              <div>
                <h4 className="text-[#93A096] font-medium text-xs mb-1">
                  Q4 2026
                </h4>
                <p className="text-[#EEEAE0] font-medium text-sm">
                  Slack / Discord Integrations
                </p>
                <p className="text-[#93A096] text-body-md mt-1.5 leading-relaxed">
                  Native messaging platform alerting with rich incident
                  payloads and acknowledge-from-chat.
                </p>
              </div>

              <div className="absolute w-3 h-3 bg-[rgba(238,234,224,0.15)] rounded-[4px] -left-[6.5px] top-[14.5rem]" />
              <div>
                <h4 className="text-[#93A096] font-medium text-xs mb-1">
                  2027
                </h4>
                <p className="text-[#EEEAE0] font-medium text-sm">
                  Custom Alert Rules Engine
                </p>
                <p className="text-[#93A096] text-body-md mt-1.5 leading-relaxed">
                  Define threshold-based escalation policies per monitor with
                  multi-channel dispatch and pager duty rotation.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <h2 className="text-xl font-medium text-[#EEEAE0] mb-8 flex items-center gap-3">
              <Quote className="w-6 h-6 text-[#E2A356]" />
              Field Reports
            </h2>
            <div className="glass rounded-[9px] p-[29.6px] relative mb-6">
              <p className="text-[#EEEAE0] leading-relaxed italic text-body-md mb-8">
                &ldquo;Finally, a monitoring tool that doesn&apos;t look like a
                toy. The strict geometry and zero-fluff dashboard fit perfectly
                alongside my terminal workflow.&rdquo;
              </p>
              <div className="border-t border-[rgba(238,234,224,0.06)] pt-6">
                <p className="font-medium text-[#9FD8BD] text-body-md">
                  System Architect
                </p>
                <p className="text-[#93A096] text-body-md mt-1">
                  Fintech Core Infrastructure
                </p>
              </div>
            </div>

            <div className="glass rounded-[9px] p-[29.6px]">
              <p className="text-[#EEEAE0] leading-relaxed italic text-body-md mb-8">
                &ldquo;Replaced three separate tools. On-call rotation,
                status page, and ping monitoring all in one rigid stack.&rdquo;
              </p>
              <div className="border-t border-[rgba(238,234,224,0.06)] pt-6">
                <p className="font-medium text-[#A3D1DF] text-body-md">
                  DevOps Lead
                </p>
                <p className="text-[#93A096] text-body-md mt-1">
                  SaaS Infrastructure &mdash; 200+ Nodes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* C T A */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="glass rounded-[9px] p-[42.75px] relative">
            <h2 className="text-2xl md:text-3xl font-medium text-[#EEEAE0] mb-4 relative">
              Ready to Deploy?
            </h2>
            <p className="text-body-md text-[#93A096] font-medium mb-8 relative">
              Provision your first workspace in under 60 seconds. No credit card
              required.
            </p>
            <Link
              href="/signup"
              className="relative inline-flex items-center gap-3 px-8 py-4 bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] text-label-md font-medium transition-all"
            >
              Initialize Setup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* F O O T E R */}
      <footer className="border-t border-[rgba(238,234,224,0.08)] py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-body-md text-[#93A096]/60 font-medium">
            &copy; {new Date().getFullYear()} PulseOps — Strict Telemetry Engine
          </p>
          <p className="text-body-md text-[#93A096]/60 font-medium">
            v1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
}
