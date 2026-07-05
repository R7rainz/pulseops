"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Row =
  | { kind: "cmd"; text: string }
  | { kind: "out"; node: ReactNode }
  | { kind: "blank" };

const Dim = ({ children }: { children: ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);

// The scripted session. Command lines type out; output lines paste in.
const ROWS: Row[] = [
  { kind: "cmd", text: "pulseops login" },
  {
    kind: "out",
    node: (
      <>
        <Dim>→ opening browser… approve code </Dim>
        <span className="text-primary">MK2B-9YBL</span>
      </>
    ),
  },
  {
    kind: "out",
    node: (
      <>
        <span className="text-up">✓ signed in</span>
        <Dim> · you@company.com · workspace 21</Dim>
      </>
    ),
  },
  { kind: "blank" },
  { kind: "cmd", text: "pulseops monitors list" },
  { kind: "out", node: <Dim>ID NAME STATUS LATENCY</Dim> },
  {
    kind: "out",
    node: (
      <>
        <span className="text-foreground">41 crosmos </span>
        <span className="text-up">● UP </span>
        <Dim>446ms</Dim>
      </>
    ),
  },
  {
    kind: "out",
    node: (
      <>
        <span className="text-foreground">39 api.example.com </span>
        <span className="text-up">● UP </span>
        <Dim>128ms</Dim>
      </>
    ),
  },
  {
    kind: "out",
    node: (
      <>
        <span className="text-foreground">7 checkout-worker </span>
        <span className="text-down">● DOWN </span>
        <Dim>—</Dim>
      </>
    ),
  },
  { kind: "blank" },
  { kind: "cmd", text: "pulseops incidents list --json | jq -r '.[].title'" },
  { kind: "out", node: <span className="text-down">Node offline: checkout-worker</span> },
];

const TYPE_MS = 34; // per character
const AFTER_CMD_MS = 450; // pause after a command finishes typing
const AFTER_OUT_MS = 240; // pause after an output line
const AFTER_BLANK_MS = 120;

export default function AnimatedTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);

  // Start when scrolled into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Drive the animation.
  useEffect(() => {
    if (!visible || step >= ROWS.length) return;
    const row = ROWS[step];
    let timer: ReturnType<typeof setTimeout>;
    if (row.kind === "cmd") {
      if (typed < row.text.length) {
        timer = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
      } else {
        timer = setTimeout(() => {
          setStep((s) => s + 1);
          setTyped(0);
        }, AFTER_CMD_MS);
      }
    } else {
      timer = setTimeout(
        () => setStep((s) => s + 1),
        row.kind === "blank" ? AFTER_BLANK_MS : AFTER_OUT_MS,
      );
    }
    return () => clearTimeout(timer);
  }, [visible, step, typed]);

  const done = step >= ROWS.length;
  const Cursor = () => (
    <span className="ml-px inline-block w-[0.55em] animate-pulse bg-primary text-transparent">
      .
    </span>
  );

  return (
    <div
      ref={ref}
      className="glass overflow-hidden rounded-2xl border border-border/70 shadow-2xl ring-1 ring-primary/5"
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-surface/40 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-down/70" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-degraded/70" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-up/70" aria-hidden />
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          pulseops — terminal
        </span>
      </div>

      {/* body — min height reserved so lines don't shift the layout as they appear */}
      <div className="min-h-[20rem] whitespace-pre-wrap p-6 font-mono text-[13px] leading-relaxed sm:p-7 sm:text-sm">
        {ROWS.slice(0, step + 1).map((row, i) => {
          if (row.kind === "blank") return <div key={i}>{" "}</div>;
          const isCurrent = i === step;
          if (row.kind === "cmd") {
            const shown = isCurrent ? row.text.slice(0, typed) : row.text;
            return (
              <div key={i}>
                <span className="text-muted-foreground">$ </span>
                <span className="text-foreground">{shown}</span>
                {isCurrent && !done && <Cursor />}
              </div>
            );
          }
          return <div key={i}>{row.node}</div>;
        })}
        {done && (
          <div>
            <span className="text-muted-foreground">$ </span>
            <Cursor />
          </div>
        )}
      </div>
    </div>
  );
}
