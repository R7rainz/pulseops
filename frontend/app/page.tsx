import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { API_URL, DOCS_URL } from "@/lib/constants";
import Clouds from "@/components/Clouds";
import ThemeToggle from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";
import { StatusDot } from "@/components/ui/status-badge";
import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import AnimatedHeadline from "@/components/AnimatedHeadline";
import MagneticButton from "@/components/MagneticButton";
import CountUp from "@/components/CountUp";
import { ShaderCard } from "@/components/three/ShaderCard";
import PricingSection from "@/components/landing/PricingSection";
import TerminalSection from "@/components/landing/TerminalSection";
import TelemetrySection from "@/components/landing/TelemetrySection";
import ChartsShowcase from "@/components/landing/ChartsShowcase";
import LogoMarquee from "@/components/landing/LogoMarquee";
import {
  ArrowRight,
  Activity,
  Bell,
  Globe,
  Siren,
  ShieldCheck,
  Workflow,
  GitPullRequest,
  Check,
  Code2,
} from "lucide-react";

const FEATURES = [
  { icon: <Activity className="h-5 w-5 text-up" />, accent: "border-up/30 bg-up/10", title: "Real-time dashboard", body: "Live status, latency and uptime for every monitor, refreshed every few seconds." },
  { icon: <Siren className="h-5 w-5 text-down" />, accent: "border-down/30 bg-down/10", title: "Incident management", body: "Incidents open automatically on threshold breach, with a full timeline and acknowledge / resolve flow." },
  { icon: <Bell className="h-5 w-5 text-degraded" />, accent: "border-degraded/30 bg-degraded/10", title: "Webhook alerts", body: "Fire notifications on status changes with delivery logs, retries and per-endpoint config." },
  { icon: <Globe className="h-5 w-5 text-info" />, accent: "border-info/30 bg-info/10", title: "Public status pages", body: "Shareable status pages with a 90-day uptime history and live system state for customers." },
  { icon: <ShieldCheck className="h-5 w-5 text-up" />, accent: "border-up/30 bg-up/10", title: "SSL & TLS monitoring", body: "Automatic certificate inspection with expiry warnings before anything goes down." },
  { icon: <Workflow className="h-5 w-5 text-primary" />, accent: "border-primary/30 bg-primary/10", title: "Built to scale", body: "A Kafka-driven scheduler and worker pool run checks in parallel — decoupled and resilient." },
];

const ROADMAP = [
  { when: "Q3 2026", active: true, title: "Multi-region checks", body: "Run probes from US-East, EU-Central and AP-South for global latency coverage." },
  { when: "Q4 2026", active: false, title: "Slack & Discord alerts", body: "Native messaging integrations with rich incident payloads and acknowledge-from-chat." },
  { when: "2027", active: false, title: "Custom alert rules", body: "Threshold-based escalation policies per monitor with on-call rotation." },
];

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
        // Expired session on the home page — clear it and show the landing
        // page rather than bouncing the visitor to /login.
        redirect("/api/auth/logout?redirect=/");
      }
    } catch (error) {
      if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
      console.error("Router fetch failed:", error);
    }
  }
  if (destination) redirect(destination);

  return (
    <div className="relative min-h-dvh overflow-hidden text-foreground selection:bg-primary/20">
      {/* SHINY METALLIC BACKGROUND — black base + silver glow behind the hero */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-background" />
        {/* full-width clouds drifting behind the hero heading */}
        <div className="absolute inset-x-0 top-0 h-[95vh]">
          <Clouds density="high" />
        </div>
        {/* diagonal metallic sheen (steel → silver) for a shiny feel */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(128deg, transparent 6%, color-mix(in oklab, var(--sheen-deep) 60%, transparent) 28%, transparent 50%, color-mix(in oklab, var(--sheen-mid) 55%, transparent) 76%, transparent 96%)",
            opacity: 0.22,
          }}
        />
        {/* thin luminous top edge */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, var(--sheen-light), transparent)",
            opacity: 0.5,
          }}
        />
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Brand href="/" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="h-9 w-9" />
            <a
              href="#developers"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              Developers
            </a>
            <a
              href="#telemetry"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              Telemetry
            </a>
            <a
              href="#pricing"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Pricing
            </a>
            <a
              href={DOCS_URL}
              className="hidden items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              <Code2 className="h-4 w-4" /> API docs
            </a>
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
      <div className="relative">
        {/* WebGL flow-field shader — full-width hero background (gated + CSS fallback) */}
        <ShaderCard className="opacity-75" />
        {/* scrim so the headline stays readable over the shader */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(78% 68% at 50% 34%, color-mix(in oklab, var(--background) 42%, transparent), var(--background) 84%)",
          }}
        />
        <section className="relative mx-auto max-w-3xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <div className="fade-up inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Calm, dependable monitoring
        </div>

        <AnimatedHeadline
          lead="Know the moment"
          accent="something breaks."
          className="mt-7 font-display font-semibold leading-[1.05] tracking-tight text-[clamp(2.5rem,6.4vw,4.5rem)]"
        />

        <p
          className="fade-up mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          PulseOps watches your endpoints around the clock — uptime, latency, SSL and incidents — and
          tells your team before your customers do.
        </p>

        <div
          className="fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <MagneticButton href="/signup" className="btn btn-primary clouds-btn group px-7 py-3.5 text-base">
            Start monitoring
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </MagneticButton>
          <MagneticButton href="#features" className="btn btn-ghost bg-surface/60 px-7 py-3.5 text-base backdrop-blur">
            See how it works
          </MagneticButton>
        </div>

        {/* INFO STATS */}
        <div className="fade-up mx-auto mt-14 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm" style={{ animationDelay: "260ms" }}>
          {[
            { node: <CountUp to={99.97} decimals={2} suffix="%" />, label: "Uptime tracked" },
            { node: <CountUp to={12} suffix="ms" />, label: "Median check" },
            { node: <CountUp to={24} suffix="/7" />, label: "Monitoring" },
          ].map((s, i) => (
            <div key={i} className="bg-surface px-4 py-5">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">{s.node}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        </section>
      </div>

      {/* PRODUCT PREVIEW */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="fade-up" style={{ animationDelay: "240ms" }}>
          <PreviewCard />
        </div>
        <div className="mt-12">
          <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Trusted by teams shipping at scale
          </p>
          <LogoMarquee />
        </div>
      </section>

      {/* LIVE CHARTS SHOWCASE */}
      <section id="telemetry-demo" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Live telemetry</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Metrics, logs and traces in one stream
          </h2>
          <p className="mt-3 text-muted-foreground">
            Watch events, latency distribution and traces update in real time — the same views your
            team gets in production.
          </p>
        </div>
        <Reveal>
          <ChartsShowcase />
        </Reveal>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-border/70 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">What you get</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to stay online
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* WebGL showcase cell — the one true 3D moment in the bento */}
            <Reveal className="md:col-span-2">
              <div className="group relative h-full min-h-[15rem] overflow-hidden rounded-2xl border border-border">
                <ShaderCard />
                <div className="relative z-10 flex h-full flex-col justify-end p-7">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-signal/40 bg-signal/10 text-signal">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold tracking-tight">Live telemetry, rendered</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Every signal flowing through your stack — uptime, latency, SSL, incidents — in one
                    calm, real-time view.
                  </p>
                </div>
              </div>
            </Reveal>

            {FEATURES.map((f, i) => (
              <Reveal key={f.title} className={`h-full ${i === 4 ? "md:col-span-2" : ""}`} delay={(i % 3) * 80}>
                <SpotlightCard className={`glass h-full rounded-2xl p-6 ${i === 4 ? "ambient-sweep" : ""}`}>
                  <div className={`mb-5 grid h-11 w-11 place-items-center rounded-xl border ${f.accent}`}>{f.icon}</div>
                  <h3 className="font-display text-base font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DEVELOPER / TERMINAL WORKFLOW */}
      <TerminalSection />

      {/* TELEMETRY DIFFERENTIATION */}
      <TelemetrySection />

      {/* PRICING */}
      <PricingSection />

      {/* ROADMAP + TESTIMONIAL */}
      <section className="section-alt border-t border-border/70 py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-8 flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
              <GitPullRequest className="h-5 w-5 text-primary" />
              On the roadmap
            </h2>
            <div className="relative space-y-8 border-l border-border pl-7">
              {ROADMAP.map((r, i) => (
                <Reveal key={r.when} delay={i * 90}>
                  <span
                    className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ${r.active ? "bg-primary" : "bg-border"}`}
                    aria-hidden="true"
                  />
                  <p className={`flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider ${r.active ? "text-primary" : "text-muted-foreground"}`}>
                    {r.active && <Check className="h-3 w-3" />}
                    {r.when}
                  </p>
                  <p className="mt-1 font-display text-sm font-medium text-foreground">{r.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="mb-8 font-display text-xl font-semibold tracking-tight">What teams say</h2>
            <Reveal delay={60}>
              <SpotlightCard className="glass rounded-2xl p-6">
                <blockquote className="text-[15px] leading-relaxed text-foreground/90">
                  “Finally a monitoring tool that feels calm instead of noisy. It tells us what matters and gets out of the way.”
                </blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary">Platform Engineer</p>
                  <p className="text-xs text-muted-foreground">Fintech core infrastructure</p>
                </figcaption>
              </SpotlightCard>
            </Reveal>
            <Reveal delay={140}>
              <SpotlightCard className="glass rounded-2xl p-6">
                <blockquote className="text-[15px] leading-relaxed text-foreground/90">
                  “Replaced three separate tools. On-call alerts, status page and uptime checks all in one place.”
                </blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-medium text-info">DevOps Lead</p>
                  <p className="text-xs text-muted-foreground">SaaS infrastructure · 200+ monitors</p>
                </figcaption>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/70 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <div className="pulse-shell">
              <div className="relative overflow-hidden rounded-[calc(var(--radius)-1px)] px-8 py-14 text-center">
                <Clouds density="med" />
                <div className="relative z-10">
                  <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ready to stop guessing?</h2>
                  <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                    Create your first workspace in under a minute. No credit card required.
                  </p>
                  <Link href="/signup" className="btn btn-primary clouds-btn group mt-8 px-7 py-3.5 text-base">
                    Get started free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <Brand href="/" size="sm" />
          <div className="flex items-center gap-4">
            <a
              href={DOCS_URL}
              className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              API docs
            </a>
            <Link
              href="/cookie-policy"
              className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cookies
            </Link>
            <p className="font-mono text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} PulseOps · Uptime &amp; telemetry
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Product preview ───────────────────────────────────────── */
const PREVIEW_ROWS = [
  { name: "api.acme.com", status: "UP", latency: "142ms", uptime: "99.98%" },
  { name: "checkout-service", status: "UP", latency: "88ms", uptime: "99.99%" },
  { name: "auth.acme.com", status: "DEGRADED", latency: "412ms", uptime: "99.71%" },
  { name: "cdn.edge", status: "UP", latency: "33ms", uptime: "100%" },
] as const;

function PreviewCard() {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold">Monitors</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-up/30 bg-up/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-up">
            <span className="h-1.5 w-1.5 rounded-full bg-up" />
            Live
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">4 monitors · all regions</span>
      </div>
      <div className="divide-y divide-border">
        {PREVIEW_ROWS.map((r) => (
          <div key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
            <div className="flex items-center gap-2.5">
              <StatusDot status={r.status} />
              <span className="truncate font-mono text-sm text-foreground">{r.name}</span>
            </div>
            <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-4 w-1 rounded-full ${r.status === "DEGRADED" && i > 10 ? "bg-degraded/70" : "bg-up/60"}`}
                />
              ))}
            </div>
            <span className="text-right font-mono text-sm tabular-nums text-muted-foreground sm:text-left">{r.latency}</span>
            <span className="hidden text-right font-mono text-sm tabular-nums text-foreground sm:block">{r.uptime}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
