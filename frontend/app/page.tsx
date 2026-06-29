import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/constants";
import Aurora from "@/components/Aurora";
import { Brand } from "@/components/Brand";
import {
  ArrowRight,
  GitPullRequest,
  Gauge,
  Timer,
  Bell,
  Globe,
  Siren,
  Activity,
  ShieldCheck,
  Workflow,
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
          workspaces.length > 0 ? `/workspaces/${workspaces[0].id}/monitors` : "/workspaces/new";
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
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground selection:bg-up/30">
      {/* AURORA BACKGROUND */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        {/* soft colour wash (always visible, even before canvas paints) */}
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_22%_25%,rgba(159,216,189,0.16),transparent_60%),radial-gradient(50%_45%_at_82%_32%,rgba(163,209,223,0.13),transparent_60%),radial-gradient(60%_50%_at_55%_98%,rgba(86,196,160,0.12),transparent_60%)]" />
        <Aurora className="absolute inset-0 h-full w-full" />
        {/* vignette for depth + readability */}
        <div className="absolute inset-0 bg-[radial-gradient(125%_95%_at_50%_28%,transparent_42%,rgba(7,11,9,0.66)_100%)]" />
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Brand href="/" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-24 text-center sm:pt-32">
        <div className="mb-8 inline-flex max-w-full items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
          </span>
          <span className="truncate">Real-time monitoring &amp; incident alerts</span>
        </div>

        <h1 className="mx-auto max-w-3xl text-balance font-display text-[2.25rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Know the moment <span className="text-up">something breaks.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          PulseOps watches your endpoints around the clock — latency, uptime, SSL, and incidents —
          and tells your team before your customers do.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn btn-primary group px-7 py-3.5 text-base">
            Start monitoring
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a href="#features" className="btn btn-ghost px-7 py-3.5 text-base">
            See features
          </a>
        </div>

        {/* METRICS BAR */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          <Stat icon={<Timer className="h-4 w-4" />} label="Median check latency" value="<12ms" />
          <Stat icon={<Gauge className="h-4 w-4" />} label="Tracked uptime SLA" value="99.97%" />
          <Stat icon={<Activity className="h-4 w-4" />} label="Monitors per workspace" value="Unlimited" />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Capabilities</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">Everything you need to stay online</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Feature
              icon={<Activity className="h-5 w-5 text-up" />}
              accent="border-up/30 bg-up/10"
              title="Real-time dashboard"
              body="Live status, latency, and uptime for every monitor, cached in Redis and refreshed every few seconds."
            />
            <Feature
              icon={<Siren className="h-5 w-5 text-down" />}
              accent="border-down/30 bg-down/10"
              title="Incident management"
              body="Incidents open automatically on threshold breach, with a full timeline and acknowledge / resolve flow."
            />
            <Feature
              icon={<Bell className="h-5 w-5 text-degraded" />}
              accent="border-degraded/30 bg-degraded/10"
              title="Webhook alerts"
              body="Fire notifications on status changes with delivery logs, retries, and per-endpoint configuration."
            />
            <Feature
              icon={<Globe className="h-5 w-5 text-info" />}
              accent="border-info/30 bg-info/10"
              title="Public status pages"
              body="Shareable status pages with a 90-day uptime history and live system state for your customers."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5 text-up" />}
              accent="border-up/30 bg-up/10"
              title="SSL & TLS monitoring"
              body="Automatic certificate inspection with expiry warnings that flag a degraded state before it goes down."
            />
            <Feature
              icon={<Workflow className="h-5 w-5 text-info" />}
              accent="border-info/30 bg-info/10"
              title="Built to scale"
              body="A Kafka-driven scheduler and BullMQ worker pool run checks in parallel — decoupled and resilient."
            />
          </div>
        </div>
      </section>

      {/* ROADMAP + TESTIMONIAL */}
      <section className="border-t border-border py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-8 flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
              <GitPullRequest className="h-5 w-5 text-info" />
              On the roadmap
            </h2>
            <ol className="relative space-y-8 border-l border-border pl-7">
              <RoadmapItem when="Q3 2026" active title="Multi-region checks" body="Run probes from US-East, EU-Central, and AP-South for global latency coverage." />
              <RoadmapItem when="Q4 2026" title="Slack & Discord alerts" body="Native messaging integrations with rich incident payloads and acknowledge-from-chat." />
              <RoadmapItem when="2027" title="Custom alert rules" body="Threshold-based escalation policies per monitor with multi-channel dispatch and on-call rotation." />
            </ol>
          </div>

          <div className="space-y-4">
            <h2 className="mb-8 font-display text-xl font-semibold tracking-tight">What teams say</h2>
            <figure className="glass rounded-lg p-6">
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                “Finally a monitoring tool that doesn’t feel like a toy. The dashboard is dense without being noisy — it fits right next to our terminals.”
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-medium text-up">Platform Engineer</p>
                <p className="text-xs text-muted-foreground">Fintech core infrastructure</p>
              </figcaption>
            </figure>
            <figure className="glass rounded-lg p-6">
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                “Replaced three separate tools. On-call alerts, status page, and uptime checks all in one place.”
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-medium text-info">DevOps Lead</p>
                <p className="text-xs text-muted-foreground">SaaS infrastructure · 200+ monitors</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="pulse-shell">
            <div className="px-8 py-12 text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight">Ready to stop guessing?</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Create your first workspace in under a minute. No credit card required.
              </p>
              <Link href="/signup" className="btn btn-primary group mt-8 px-7 py-3.5 text-base">
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <Brand href="/" size="sm" />
          <p className="font-mono text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} PulseOps · Uptime &amp; telemetry
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface px-6 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 flex items-center justify-center gap-2 font-display text-xl font-semibold text-up sm:justify-start">
        {icon}
        {value}
      </p>
    </div>
  );
}

function Feature({
  icon,
  accent,
  title,
  body,
}: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <div className="glass group rounded-lg p-6 transition-colors duration-200 hover:border-up/25">
      <div className={`mb-5 grid h-11 w-11 place-items-center rounded-lg border ${accent}`}>{icon}</div>
      <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function RoadmapItem({
  when,
  title,
  body,
  active = false,
}: {
  when: string;
  title: string;
  body: string;
  active?: boolean;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ${active ? "bg-up" : "bg-border"}`}
        aria-hidden="true"
      />
      <p className={`font-mono text-xs font-medium uppercase tracking-wider ${active ? "text-up" : "text-muted-foreground"}`}>
        {when}
      </p>
      <p className="mt-1 font-display text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
