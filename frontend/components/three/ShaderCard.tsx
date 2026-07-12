"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { useCapability } from "./useCapability";

/** CSS gradient fallback for reduced-motion / low-power / SSR. */
function ShaderFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: "linear-gradient(135deg, #001a21 0%, #063540 55%, #0f6d76 100%)" }}
    />
  );
}

// Code-split + client-only.
const FlowFieldScene = dynamic(() => import("./FlowFieldScene"), {
  ssr: false,
  loading: () => <ShaderFallback />,
});

/**
 * Decorative WebGL background for a single showcase card. Drop as an absolute
 * child of a `position: relative` card; put content above it. Gated behind
 * capability + reduced-motion (CSS fallback), pauses its loop off-screen.
 */
export function ShaderCard({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const cap = useCapability();
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
      {show ? <FlowFieldScene paused={paused} /> : <ShaderFallback />}
    </div>
  );
}
