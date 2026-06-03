import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Terminal,
  Shield,
  Zap,
  ArrowRight,
  GitPullRequest,
  Quote,
} from "lucide-react";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  let destination: string | null = null;

  if (token) {
    try {
      const res = await fetch("http://127.0.0.1:4000/api/v1/workspaces", {
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
      {/* BACKGROUND: Pulsating Core Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500 opacity-[0.15] blur-[100px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500 opacity-[0.1] blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* STRICT NAVIGATION */}
      <nav className="border-b-2 border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-wider text-zinc-100 uppercase">
              Pulse<span className="text-emerald-400">Ops</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wide"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-colors uppercase tracking-widest"
            >
              Deploy Now
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center border-x-2 border-zinc-900/50">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 border-2 border-zinc-800 text-cyan-400 text-xs font-bold mb-8 uppercase tracking-widest">
          <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
          System V1.0 Online
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight uppercase">
          Strict Telemetry. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Zero Bloat.
          </span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          The developer-first uptime monitoring engine. Rigid workspaces, exact
          millisecond latency tracking, and raw terminal-grade reliability.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider transition-colors shadow-[4px_4px_0px_0px_rgba(52,211,153,0.2)]"
          >
            Initialize Setup
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 px-8 py-4 bg-zinc-950 border-2 border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold uppercase tracking-wider transition-colors"
          >
            <Terminal className="w-4 h-4" />
            Read Docs
          </a>
        </div>
      </main>

      {/* FEATURES GRID */}
      <section
        id="features"
        className="border-t-2 border-zinc-900 bg-zinc-950 py-24"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-zinc-900/50 border-2 border-zinc-800 hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center mb-6">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-wide">
                Edge-Optimized
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Pings are executed with minimal network overhead. Get exact
                latency metrics without frontend processing delay.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/50 border-2 border-zinc-800 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center mb-6">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-wide">
                Strict Isolation
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Hard boundaries between workspaces. Manage production and
                staging targets without data bleed.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/50 border-2 border-zinc-800 hover:border-red-500/50 transition-colors">
              <div className="w-12 h-12 bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center mb-6">
                <Terminal className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3 uppercase tracking-wide">
                CLI Native
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Built strictly for keyboard-driven engineers. Clean UI, raw
                execution logs, and straightforward data architecture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP & TESTIMONIALS */}
      <section className="border-t-2 border-zinc-900 bg-zinc-900/20 py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Upcoming Roadmap */}
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-widest text-zinc-100 mb-8 flex items-center gap-3">
              <GitPullRequest className="w-6 h-6 text-cyan-400" />
              System Roadmap
            </h2>
            <div className="space-y-4 border-l-2 border-zinc-800 pl-6 relative">
              <div className="absolute w-3 h-3 bg-emerald-400 -left-[7px] top-2" />
              <div>
                <h4 className="text-emerald-400 font-bold text-sm uppercase">
                  Q3 2026
                </h4>
                <p className="text-zinc-300 font-medium mt-1">
                  Multi-Region Ping Execution
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  Dispatch workers from US-East, EU-Central, and AP-South
                  concurrently.
                </p>
              </div>

              <div className="absolute w-3 h-3 bg-zinc-700 -left-[7px] top-24" />
              <div className="pt-6">
                <h4 className="text-zinc-500 font-bold text-sm uppercase">
                  Q4 2026
                </h4>
                <p className="text-zinc-400 font-medium mt-1">
                  Webhook Incident Routing
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Native Discord and Slack integration for downtime alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-widest text-zinc-100 mb-8 flex items-center gap-3">
              <Quote className="w-6 h-6 text-red-400" />
              Field Reports
            </h2>
            <div className="p-8 border-2 border-zinc-800 bg-zinc-950 relative hover:border-zinc-700 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Terminal className="w-16 h-16" />
              </div>
              <p className="text-zinc-300 leading-relaxed italic mb-6">
                "Finally, a monitoring tool that doesn't look like a toy. The
                strict geometry and zero-fluff dashboard fit perfectly alongside
                my terminal workflow."
              </p>
              <div>
                <p className="font-bold text-emerald-400 uppercase text-sm">
                  System Architect
                </p>
                <p className="text-zinc-600 text-xs">
                  Fintech Core Infrastructure
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
