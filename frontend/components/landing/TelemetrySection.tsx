import { Check, ArrowRight, Zap, Radio, Boxes, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import {
  PIPELINE_STEPS,
  TELEMETRY_COLUMNS,
  TELEMETRY_MATRIX,
  TELEMETRY_DIFFERENTIATORS,
} from "@/lib/pricing";

const STEP_ICONS = [Radio, Zap, Boxes, Database];

/**
 * TelemetrySection — factual differentiation of PulseOps' built-in telemetry
 * pipeline against OpenTelemetry / Datadog / Grafana+Prometheus. Every claim
 * maps to real architecture (Kafka → Go ping-engine → consumer → Redis).
 */
export default function TelemetrySection() {
  return (
    <section id="telemetry" className="relative border-t border-border/70 py-24">
      <div className="texture-grid pointer-events-none absolute inset-0 -z-10 opacity-50" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Telemetry</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A telemetry pipeline, not a telemetry project
          </h2>
          <p className="mt-3 text-muted-foreground">
            The Kafka event bus, Redis live cache and Go worker pool ship inside PulseOps. You point
            it at a URL — there’s no collector to deploy or time-series database to size.
          </p>
        </div>

        {/* Pipeline diagram */}
        <Reveal>
          <div className="glass rounded-2xl p-6 sm:p-8">
            <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              How a check flows
            </p>
            <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = STEP_ICONS[i] ?? Zap;
                return (
                  <div key={step.label} className="flex flex-1 items-center gap-3">
                    <div className="flex-1 rounded-xl border border-border bg-surface/60 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/25 bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </span>
                        <span className="font-display text-sm font-semibold">{step.label}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{step.sub}</p>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 lg:block" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Differentiator cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TELEMETRY_DIFFERENTIATORS.map((d, i) => (
            <Reveal key={d.title} delay={(i % 3) * 80} className="h-full">
              <SpotlightCard className="glass h-full rounded-2xl p-6">
                <h3 className="font-display text-base font-semibold tracking-tight">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-14">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h3 className="font-display text-2xl font-semibold tracking-tight">How it compares</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Each tool is built for a different job. Here’s where PulseOps fits — and where the
              others are the right call.
            </p>
          </div>

          <Reveal>
            <div className="glass overflow-x-auto rounded-2xl">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-4 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Dimension
                    </th>
                    {TELEMETRY_COLUMNS.map((col) => (
                      <th
                        key={col.name}
                        className={cn(
                          "px-5 py-4 text-left align-top",
                          col.self && "bg-primary/[0.05]",
                        )}
                      >
                        <span
                          className={cn(
                            "font-display text-sm font-semibold",
                            col.self ? "text-primary" : "text-foreground",
                          )}
                        >
                          {col.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground">
                          {col.note}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TELEMETRY_MATRIX.map((row) => (
                    <tr key={row.dimension} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3.5 font-medium text-foreground/90">{row.dimension}</td>
                      {row.cells.map((cell, i) => {
                        const self = TELEMETRY_COLUMNS[i]?.self;
                        return (
                          <td
                            key={i}
                            className={cn(
                              "px-5 py-3.5 align-top leading-relaxed",
                              self ? "bg-primary/[0.05] text-foreground" : "text-muted-foreground",
                            )}
                          >
                            <span className="flex items-start gap-1.5">
                              {self && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" aria-hidden="true" />}
                              {cell}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            OpenTelemetry, Datadog and Grafana/Prometheus are trademarks of their respective owners.
            Comparison reflects typical setup and is not an endorsement.
          </p>
        </div>
      </div>
    </section>
  );
}
