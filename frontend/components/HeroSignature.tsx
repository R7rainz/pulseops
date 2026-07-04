"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./three/useReducedMotion";
import { useCapability } from "./three/useCapability";

/** CSS-only Iris aurora — the fallback for reduced-motion / low-power / SSR. */
function WebGLFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute left-1/2 top-[36%] h-[520px] w-[520px] -translate-x-1/2 rounded-full animate-drift"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--signal-cyan) 30%, transparent), transparent 62%)",
          filter: "blur(72px)",
        }}
      />
      <div
        className="absolute left-[38%] top-[54%] h-[440px] w-[440px] rounded-full animate-sway"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--signal-indigo) 26%, transparent), transparent 64%)",
          filter: "blur(84px)",
        }}
      />
    </div>
  );
}

// Overall backdrop dimming — keeps the field quiet behind the hero.
const BASE_OPACITY = 0.7;

// Code-split + client-only: Three.js never ships in the SSR/first-paint bundle.
const SignatureScene = dynamic(() => import("./three/SignatureScene"), {
  ssr: false,
  loading: () => <WebGLFallback />,
});

/**
 * Decorative hero background. Renders the WebGL node-network on capable devices
 * with motion enabled; otherwise the CSS aurora. Fades out and pauses its render
 * loop as the hero scrolls away. Purely decorative → aria-hidden, no pointer.
 */
export function HeroSignature() {
  const reduced = useReducedMotion();
  const cap = useCapability();
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const showScene = cap === "capable" && !reduced;

  // Fade the field out of the center so it never competes with the headline,
  // and keep it dim overall — a quiet backdrop, not a foreground animation.
  const CENTER_MASK =
    "radial-gradient(115% 85% at 50% 38%, transparent 0%, transparent 40%, #000 78%)";

  useEffect(() => {
    if (!showScene) return;
    const el = containerRef.current;
    if (!el) return;

    // Pause the render loop when the hero is out of view.
    const io = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);

    // Fade the canvas as the hero scrolls up (direct DOM write, no re-render).
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / (r.height * 0.85)));
        el.style.opacity = String((1 - p) * BASE_OPACITY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [showScene]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden transition-opacity duration-300"
      style={{
        opacity: BASE_OPACITY,
        maskImage: CENTER_MASK,
        WebkitMaskImage: CENTER_MASK,
      }}
    >
      {showScene ? <SignatureScene paused={paused} /> : <WebGLFallback />}
    </div>
  );
}
