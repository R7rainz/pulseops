import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/constants";
import {
  Activity,
  Terminal,
  Shield,
  Zap,
  ArrowRight,
  GitPullRequest,
  Quote,
  Radio,
  Gauge,
  Timer,
  Bell,
  Globe,
  BarChart3,
  Siren,
  Webhook,
  ScrollText,
  Server,
  Workflow,
  AlarmClock,
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
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50 font-mono overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* HEX GRID BACKGROUND */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500 opacity-[0.08] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500 opacity-[0.06] blur-[150px] rounded-full animate-pulse" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-emerald-400 opacity-[0.04] blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* N A V */}
      <nav className="border-b-2 border-zinc-900 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/10 border-2 border-emerald-500/30">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-wider text-zinc-100 uppercase">
              Pulse<span className="text-emerald-400">Ops</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors font-medium uppercase tracking-widest"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-colors uppercase tracking-widest border-2 border-transparent hover:border-emerald-300"
            >
              Deploy Now
            </Link>
          </div>
        </div>
      </nav>

      {/* H E R O */}
      <section className="relative border-b-2 border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-28 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-zinc-900 border-2 border-zinc-800 text-cyan-400 text-xs font-bold mb-10 uppercase tracking-[0.25em]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            v1.0 — Kafka Pipeline &bull; Redis Cache &bull; BullMQ Workers
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 max-w-4xl mx-auto leading-none uppercase">
            Strict Telemetry.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400">
              Zero Bloat.
            </span>
          </h1>

          <p className="text-zinc-500 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed uppercase tracking-wider font-bold">
            Developer-first uptime monitoring with incident management,
            <br />
            Kafka-driven scheduling, real-time webhook alerts, and public status pages.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(52,211,153,0.25)] hover:shadow-[6px_6px_0px_0px_rgba(52,211,153,0.35)]"
            >
              Initialize Setup
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 bg-zinc-950 border-2 border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-bold uppercase tracking-widest transition-all"
            >
              <Terminal className="w-4 h-4" />
              Read Docs
            </a>
          </div>

          {/* LIVE METRICS BAR */}
          <div className="mt-20 max-w-3xl mx-auto grid grid-cols-3 gap-0 border-2 border-zinc-900 divide-x-2 divide-zinc-900">
            <div className="p-5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold mb-1">Avg Latency</p>
              <p className="text-lg font-black text-emerald-400 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                &lt;12ms
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold mb-1">Uptime SLA</p>
              <p className="text-lg font-black text-emerald-400 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                99.97%
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold mb-1">Nodes Tracked</p>
              <p className="text-lg font-black text-emerald-400 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Unlimited
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* F E A T U R E S */}
      <section id="features" className="border-b-2 border-zinc-900 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3">Core Capabilities</h2>
            <p className="text-2xl md:text-3xl font-black uppercase tracking-widest text-zinc-100">
              Engineered for <span className="text-emerald-400">Precision</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group p-8 bg-zinc-950 border-2 border-zinc-800 hover:border-cyan-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6 group-hover:border-cyan-500/50 transition-colors">
                <Server className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                Kafka Pipeline
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                Monitor dispatch flows through Kafka topics. Go worker pool
                executes probes — decoupled, scalable, resilient.
              </p>
            </div>

            <div className="group p-8 bg-zinc-950 border-2 border-zinc-800 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6 group-hover:border-emerald-500/50 transition-colors">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                Real-Time Dashboard
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                SWR-driven live metrics with Redis cache layer. Monitor status,
                latency histograms, and uptime heatmaps update in real time.
              </p>
            </div>

            <div className="group p-8 bg-zinc-950 border-2 border-zinc-800 hover:border-red-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6 group-hover:border-red-500/50 transition-colors">
                <Siren className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                Incident Management
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                Automatic incident creation on threshold breach. Full timeline
                with acknowledge/resolve workflow and probe context.
              </p>
            </div>

            <div className="group p-8 bg-zinc-950 border-2 border-zinc-800 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6 group-hover:border-emerald-500/50 transition-colors">
                <Bell className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                Webhook Alerts
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                Fire webhook notifications on status changes. Delivery logs,
                retry logic, and per-endpoint configuration.
              </p>
            </div>

            <div className="group p-8 bg-zinc-950 border-2 border-zinc-800 hover:border-cyan-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6 group-hover:border-cyan-500/50 transition-colors">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                Public Status Pages
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                Shareable status pages with 90-day uptime heatmap, live monitor
                states, and incident history.
              </p>
            </div>

            <div className="group p-8 bg-zinc-950 border-2 border-zinc-800 hover:border-red-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6 group-hover:border-red-500/50 transition-colors">
                <BarChart3 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                SSL &amp; TLS Monitoring
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                Automatic SSL certificate inspection with expiry alerts.
                Degraded state triggers separate incident threads.
              </p>
            </div>
          </div>

          {/* ARCHITECTURE HIGHLIGHT */}
          <div className="mt-16 p-10 border-2 border-zinc-800 bg-zinc-950/50">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-14 h-14 bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center shrink-0">
                <Workflow className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-widest">
                  Pipeline Architecture
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-medium mb-4">
                  Kafka dispatches monitor checks to a dedicated Go worker pool
                  for parallel execution. Results flow through BullMQ queues for
                  incident evaluation, webhook delivery, and alert processing.
                  Redis caches live metrics for sub-millisecond dashboard reads.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Kafka</span>
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Go Workers</span>
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">BullMQ</span>
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Redis</span>
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Fastify</span>
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* R O A D M A P   +   T E S T I M O N I A L */}
      <section className="border-b-2 border-zinc-900 bg-zinc-950 py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Roadmap */}
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-8 flex items-center gap-3">
              <GitPullRequest className="w-6 h-6 text-cyan-400" />
              System Roadmap
            </h2>
            <div className="space-y-8 border-l-2 border-zinc-800 pl-8 relative">
              <div className="absolute w-3 h-3 bg-emerald-400 -left-[7px] top-1.5" />
              <div>
                <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
                  Q3 2026
                </h4>
                <p className="text-zinc-200 font-bold text-sm uppercase tracking-wide">
                  Multi-Region Ping Grid
                </p>
                <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">
                  Dispatch probes from US-East, EU-Central, and AP-South
                  concurrently for global latency coverage.
                </p>
              </div>

              <div className="absolute w-3 h-3 bg-zinc-700 -left-[7px] top-[7.5rem]" />
              <div>
                <h4 className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-1">
                  Q4 2026
                </h4>
                <p className="text-zinc-300 font-bold text-sm uppercase tracking-wide">
                  Slack / Discord Integrations
                </p>
                <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">
                  Native messaging platform alerting with rich incident
                  payloads and acknowledge-from-chat.
                </p>
              </div>

              <div className="absolute w-3 h-3 bg-zinc-700 -left-[7px] top-[14.5rem]" />
              <div>
                <h4 className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-1">
                  2027
                </h4>
                <p className="text-zinc-300 font-bold text-sm uppercase tracking-wide">
                  Custom Alert Rules Engine
                </p>
                <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">
                  Define threshold-based escalation policies per monitor with
                  multi-channel dispatch and pager duty rotation.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-8 flex items-center gap-3">
              <Quote className="w-6 h-6 text-red-400" />
              Field Reports
            </h2>
            <div className="p-8 border-2 border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-colors relative">
              <div className="absolute top-0 right-0 p-4 opacity-[0.04]">
                <Terminal className="w-24 h-24" />
              </div>
              <p className="text-zinc-300 leading-relaxed italic mb-8 text-sm">
                &ldquo;Finally, a monitoring tool that doesn&apos;t look like a
                toy. The strict geometry and zero-fluff dashboard fit perfectly
                alongside my terminal workflow.&rdquo;
              </p>
              <div className="border-t-2 border-zinc-900 pt-6">
                <p className="font-bold text-emerald-400 uppercase text-xs tracking-widest">
                  System Architect
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Fintech Core Infrastructure
                </p>
              </div>
            </div>

            <div className="mt-6 p-8 border-2 border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-colors">
              <p className="text-zinc-400 leading-relaxed italic mb-8 text-sm">
                &ldquo;Replaced three separate tools. On-call rotation,
                status page, and ping monitoring all in one rigid stack.&rdquo;
              </p>
              <div className="border-t-2 border-zinc-900 pt-6">
                <p className="font-bold text-cyan-400 uppercase text-xs tracking-widest">
                  DevOps Lead
                </p>
                <p className="text-zinc-600 text-xs mt-1">
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
          <div className="p-12 border-2 border-emerald-900/30 bg-emerald-950/5 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-zinc-100 mb-4 relative">
              Ready to Deploy?
            </h2>
            <p className="text-zinc-500 text-sm uppercase tracking-wider font-bold mb-8 relative">
              Provision your first workspace in under 60 seconds. No credit card
              required.
            </p>
            <Link
              href="/signup"
              className="relative inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(52,211,153,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(52,211,153,0.3)]"
            >
              Initialize Setup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* F O O T E R */}
      <footer className="border-t-2 border-zinc-900 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
            &copy; {new Date().getFullYear()} PulseOps — Strict Telemetry Engine
          </p>
          <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
            v1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
}
