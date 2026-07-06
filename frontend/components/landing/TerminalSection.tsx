import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import AnimatedTerminal from "./AnimatedTerminal";
import { Terminal, SquareTerminal, LayoutDashboard, Bot } from "lucide-react";

const POINTS = [
  {
    icon: <Terminal className="h-5 w-5 text-primary" />,
    accent: "border-primary/30 bg-primary/10",
    title: "One-command login",
    body: "`pulseops login` opens your browser to approve — password, Google/GitHub or 2FA. No API keys or workspace IDs to copy around.",
  },
  {
    icon: <SquareTerminal className="h-5 w-5 text-up" />,
    accent: "border-up/30 bg-up/10",
    title: "Scriptable CLI",
    body: "Pipe it anywhere — `pulseops monitors list --json | jq`. Gate a deploy on green, send heartbeats from cron, wire it into any workflow.",
  },
  {
    icon: <LayoutDashboard className="h-5 w-5 text-info" />,
    accent: "border-info/30 bg-info/10",
    title: "Live TUI dashboard",
    body: "Just run `pulseops` — a full-screen, vim-key dashboard of status, latency graphs and incidents, refreshing in place without leaving the terminal.",
  },
  {
    icon: <Bot className="h-5 w-5 text-degraded" />,
    accent: "border-degraded/30 bg-degraded/10",
    title: "AI-agent ready",
    body: "A read-only MCP server lets Claude and other agents answer “which monitors are down?” from your live data — safe, because it can only read.",
  },
];

/** Renders inline `code` spans inside a point's body. */
function Body({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={i}
            className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[12.5px] text-foreground"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function TerminalSection() {
  return (
    <section id="developers" className="border-t border-border/70 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            For developers
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Monitoring that lives where you work
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Stay in the terminal. Sign in once, then reach your monitors,
            incidents and uptime as a scriptable CLI, a live dashboard, or a tool
            your AI agent can query — the same API that powers this app.
          </p>
        </div>

        {/* Full-width animated terminal */}
        <Reveal>
          <div className="mx-auto max-w-3xl">
            <AnimatedTerminal />
          </div>
        </Reveal>

        {/* Value cards */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} className="h-full" delay={(i % 4) * 70}>
              <SpotlightCard className="glass h-full rounded-2xl p-6">
                <div
                  className={`mb-4 grid h-11 w-11 place-items-center rounded-xl border ${p.accent}`}
                >
                  {p.icon}
                </div>
                <h3 className="font-display text-base font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <Body text={p.body} />
                </p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
