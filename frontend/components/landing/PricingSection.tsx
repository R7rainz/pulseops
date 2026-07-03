"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, Minus, ChevronDown, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";
import {
  TIERS,
  MATRIX,
  perMonth,
  billedTotal,
  type Billing,
  type Tier,
  type Cell,
} from "@/lib/pricing";

export default function PricingSection() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [showMatrix, setShowMatrix] = useState(false);

  return (
    <section id="pricing" className="relative border-t border-border/70 py-24">
      {/* subtle dotted texture behind the pricing block for contrast */}
      <div className="texture-dots pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free. Scale when you ship.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every plan includes the full monitoring core. Pay only when you outgrow five monitors.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-12 flex items-center justify-center gap-3">
          <BillingToggle billing={billing} setBilling={setBilling} />
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.id} delay={i * 90} className="h-full">
              <PricingCard tier={tier} billing={billing} />
            </Reveal>
          ))}
        </div>

        {/* Comparison matrix */}
        <div className="mt-14">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowMatrix((v) => !v)}
              aria-expanded={showMatrix}
              className="btn btn-ghost bg-surface/60 backdrop-blur"
            >
              {showMatrix ? "Hide" : "Compare all features"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showMatrix && "rotate-180")} />
            </button>
          </div>

          <div
            className={cn(
              "grid transition-all duration-500 ease-out",
              showMatrix ? "mt-8 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <ComparisonMatrix />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Billing toggle ─────────────────────────────────────────── */
function BillingToggle({ billing, setBilling }: { billing: Billing; setBilling: (b: Billing) => void }) {
  return (
    <div className="relative inline-flex items-center rounded-full border border-border bg-surface/70 p-1 backdrop-blur">
      {/* sliding pill */}
      <span
        className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-transform duration-300 ease-out"
        style={{ transform: billing === "annual" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)" }}
        aria-hidden="true"
      />
      {(["monthly", "annual"] as const).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => setBilling(b)}
          className={cn(
            "relative z-10 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors",
            billing === b ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {b}
          {b === "annual" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                billing === "annual"
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "bg-up/15 text-up",
              )}
            >
              2 MO FREE
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Pricing card ───────────────────────────────────────────── */
function PricingCard({ tier, billing }: { tier: Tier; billing: Billing }) {
  const price = perMonth(tier, billing);
  const total = billedTotal(tier, billing);

  return (
    <div
      className={cn(
        "spotlight glass relative flex h-full flex-col rounded-2xl p-7",
        tier.featured && "border-gradient-signal shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)]",
      )}
    >
      {tier.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-surface px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-sm">
          Most popular
        </span>
      )}

      <div className="mb-5">
        <h3 className="font-display text-lg font-semibold tracking-tight">{tier.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-6 min-h-[4.5rem]">
        {price == null ? (
          <p className="font-display text-4xl font-semibold tracking-tight">Custom</p>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span
              key={`${tier.id}-${billing}`}
              className="price-swap font-display text-4xl font-semibold tabular-nums tracking-tight"
            >
              ${price}
            </span>
            <span className="text-sm text-muted-foreground">
              {price === 0 ? "forever" : "/mo"}
            </span>
          </div>
        )}
        <p className="mt-1.5 h-4 text-xs text-muted-foreground">
          {price == null
            ? "Volume-based, billed annually"
            : price === 0
              ? "No credit card required"
              : billing === "annual"
                ? `Billed $${total} per year`
                : "Billed monthly"}
        </p>
      </div>

      <Link
        href={tier.cta.href}
        className={cn(
          "btn group mb-7 w-full",
          tier.featured ? "btn-primary" : "btn-ghost bg-surface/60",
        )}
      >
        {tier.cta.label}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>

      {/* Perks with hover hint */}
      <ul className="space-y-3">
        {tier.perks.map((perk) => (
          <li key={perk.label} className="group/perk relative flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-up" aria-hidden="true" />
            <span className="text-foreground/90">
              {perk.label}
              {perk.hint && (
                <Info className="ml-1 inline-block h-3 w-3 -translate-y-px text-muted-foreground/70" aria-hidden="true" />
              )}
            </span>
            {perk.hint && (
              <span
                role="tooltip"
                className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 w-56 translate-y-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-muted-foreground opacity-0 shadow-xl transition-all duration-150 group-hover/perk:visible group-hover/perk:translate-y-0 group-hover/perk:opacity-100"
              >
                {perk.hint}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Comparison matrix ──────────────────────────────────────── */
function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-up" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Not included" />;
  return <span className="font-mono text-xs text-foreground">{value}</span>;
}

function ComparisonMatrix() {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-4 text-left font-display text-sm font-semibold">Features</th>
            {TIERS.map((t) => (
              <th
                key={t.id}
                className={cn(
                  "px-5 py-4 text-center font-display text-sm font-semibold",
                  t.featured && "text-primary",
                )}
              >
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((group) => (
            <Fragment key={group.group}>
              <tr className="bg-surface/40">
                <td
                  colSpan={4}
                  className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {group.group}
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.feature} className="border-b border-border/60 last:border-0 hover:bg-surface/30">
                  <td className="px-5 py-3 text-foreground/90">{row.feature}</td>
                  <td className="px-5 py-3 text-center">
                    <CellValue value={row.free} />
                  </td>
                  <td className="bg-primary/[0.04] px-5 py-3 text-center">
                    <CellValue value={row.pro} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <CellValue value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
