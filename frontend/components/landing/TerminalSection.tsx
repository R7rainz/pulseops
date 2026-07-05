import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import { Terminal, SquareTerminal, LayoutDashboard, Bot } from "lucide-react";

const POINTS = [
  {
    icon: <Terminal className="h-5 w-5 text-primary" />,
    accent: "border-primary/30 bg-primary/10",
    title: "One-command login",
    body: "`pulseops login` opens your browser to approve — works with password, Google/GitHub, or 2FA. No API keys or workspace IDs to copy around.",
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
    body: "`pulseops-tui` — a full-screen, vim-key dashboard of status, latency and incidents, refreshing in place without leaving the terminal.",
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

function Line({ children }: { children: React.ReactNode }) {
  return <div className="whitespace-pre">{children}</div>;
}
const Prompt = () => <span className="text-muted-foreground">$ </span>;
const Cmd = ({ children }: { children: React.ReactNode }) => (
  <span className="text-foreground">{children}</span>
);
const Dim = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);

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

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Terminal mockup */}
          <Reveal>
            <div className="glass overflow-hidden rounded-2xl border border-border/70 shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-down/70" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-degraded/70" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-up/70" aria-hidden />
                <span className="ml-3 font-mono text-xs text-muted-foreground">
                  pulseops — terminal
                </span>
              </div>
              <div className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
                <Line>
                  <Prompt />
                  <Cmd>pulseops login</Cmd>
                </Line>
                <Line>
                  <Dim>→ opening browser… approve code </Dim>
                  <span className="text-primary">MK2B-9YBL</span>
                </Line>
                <Line>
                  <span className="text-up">✓ signed in</span>
                  <Dim> · you@company.com · workspace 21</Dim>
                </Line>
                <Line>{" "}</Line>
                <Line>
                  <Prompt />
                  <Cmd>pulseops monitors list</Cmd>
                </Line>
                <Line>
                  <Dim>ID NAME STATUS LATENCY</Dim>
                </Line>
                <Line>
                  <span className="text-foreground">41 crosmos </span>
                  <span className="text-up">● UP </span>
                  <Dim>446ms</Dim>
                </Line>
                <Line>
                  <span className="text-foreground">39 api.example.com </span>
                  <span className="text-up">● UP </span>
                  <Dim>128ms</Dim>
                </Line>
                <Line>
                  <span className="text-foreground">7 checkout-worker </span>
                  <span className="text-down">● DOWN </span>
                  <Dim>—</Dim>
                </Line>
                <Line>{" "}</Line>
                <Line>
                  <Prompt />
                  <Cmd>pulseops monitors list --json | jq -r </Cmd>
                  <Dim>&apos;.[]|select(.status!=&quot;UP&quot;).name&apos;</Dim>
                </Line>
                <Line>
                  <span className="text-down">checkout-worker</span>
                </Line>
                <Line>
                  <span className="animate-pulse text-primary">▋</span>
                </Line>
              </div>
            </div>
          </Reveal>

          {/* Points */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {POINTS.map((p, i) => (
              <Reveal key={p.title} className="h-full" delay={(i % 2) * 80}>
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
      </div>
    </section>
  );
}
