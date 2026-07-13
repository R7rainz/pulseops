"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { useCapability } from "./useCapability";
import { useThemeColors } from "@/lib/useThemeColors";

/** CSS gradient fallback (theme-aware) for reduced-motion / low-power / SSR. */
function ShaderFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, var(--card) 0%, var(--accent-deep) 55%, var(--accent-mid) 100%)",
      }}
    />
  );
}

// Code-split + client-only.
const FlowFieldScene = dynamic(() => import("./FlowFieldScene"), {
  ssr: false,
  loading: () => <ShaderFallback />,
});

/**
 * Decorative WebGL flow-field background for a card / hero. Drop as an absolute
 * child of a `position: relative` container; put content above it. Colors track
 * the active theme. Gated behind capability + reduced-motion (CSS fallback),
 * pauses its loop off-screen.
 */
export function ShaderCard({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const cap = useCapability();
  const c = useThemeColors();
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const show = cap === "capable" && !reduced;

  useEffect(() => {
    if (!show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {show ? (
        <FlowFieldScene paused={paused} colorA={c.signalIndigo} colorB={c.accentLight} bg={c.card} />
      ) : (
        <ShaderFallback />
      )}
    </div>
  );
}
