"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Aurora — an immersive, living backdrop of slow-drifting light orbs that
 * gently breathe, lean toward the pointer, and trail a soft glow at the cursor.
 * Rendered to a downscaled canvas and CSS-blurred (cheap + dreamy). Honors
 * `prefers-reduced-motion` (one still frame) and pauses on hidden tabs.
 *
 * Theme-aware, read live from the `.dark` class so toggling re-tints instantly:
 *  - DARK  → saturated orbs with additive blending so they glow on the deep
 *            base, over a soft indigo/violet/teal wash.
 *  - LIGHT → cooler arctic orbs with normal blending (additive would wash to
 *            white on a light page), over a faint sky wash.
 *
 * Drop-in for the old AmbientGlow: same `{ className, tone }` API.
 */
interface Orb {
  hue: readonly [number, number, number];
  x: number;
  y: number;
  r: number;
  ampX: number;
  ampY: number;
  speed: number;
  phase: number;
  depth: number;
  alpha: number;
}

// LIGHT — arctic blues, painted normally so they read as soft colour washes.
const LIGHT_ORBS: Orb[] = [
  { hue: [99, 138, 255], x: 0.24, y: 0.28, r: 0.58, ampX: 0.05, ampY: 0.04, speed: 0.05, phase: 0, depth: 30, alpha: 0.55 },
  { hue: [56, 189, 248], x: 0.76, y: 0.34, r: 0.5, ampX: 0.045, ampY: 0.05, speed: 0.042, phase: 1.7, depth: 42, alpha: 0.48 },
  { hue: [150, 178, 240], x: 0.5, y: 0.8, r: 0.62, ampX: 0.06, ampY: 0.035, speed: 0.035, phase: 3.1, depth: 22, alpha: 0.46 },
  { hue: [179, 156, 208], x: 0.88, y: 0.78, r: 0.42, ampX: 0.04, ampY: 0.045, speed: 0.03, phase: 4.4, depth: 34, alpha: 0.4 },
  { hue: [168, 218, 220], x: 0.12, y: 0.74, r: 0.46, ampX: 0.05, ampY: 0.04, speed: 0.038, phase: 2.2, depth: 26, alpha: 0.42 },
];

// DARK — luminous indigo / violet / cyan, additively blended so they glow.
const DARK_ORBS: Orb[] = [
  { hue: [124, 140, 255], x: 0.24, y: 0.26, r: 0.6, ampX: 0.06, ampY: 0.045, speed: 0.055, phase: 0, depth: 34, alpha: 0.85 },
  { hue: [167, 139, 250], x: 0.78, y: 0.32, r: 0.52, ampX: 0.05, ampY: 0.055, speed: 0.046, phase: 1.7, depth: 46, alpha: 0.72 },
  { hue: [94, 234, 212], x: 0.5, y: 0.82, r: 0.64, ampX: 0.065, ampY: 0.04, speed: 0.04, phase: 3.1, depth: 24, alpha: 0.55 },
  { hue: [88, 150, 255], x: 0.9, y: 0.78, r: 0.46, ampX: 0.045, ampY: 0.05, speed: 0.034, phase: 4.4, depth: 38, alpha: 0.62 },
  { hue: [179, 156, 208], x: 0.1, y: 0.72, r: 0.5, ampX: 0.055, ampY: 0.045, speed: 0.042, phase: 2.2, depth: 28, alpha: 0.55 },
];

export default function Aurora({
  className,
  tone = "subtle",
}: {
  className?: string;
  tone?: "subtle" | "vivid";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const k = tone === "vivid" ? 1 : 0.88; // intensity factor

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SCALE = 0.5; // render small, CSS-blur up — soft + cheap
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width * SCALE));
      h = Math.max(1, Math.floor(rect.height * SCALE));
      canvas!.width = w;
      canvas!.height = h;
    }

    function paintOrb(cx: number, cy: number, radius: number, hue: readonly [number, number, number], alpha: number) {
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, `rgba(${hue[0]},${hue[1]},${hue[2]},${alpha})`);
      g.addColorStop(1, `rgba(${hue[0]},${hue[1]},${hue[2]},0)`);
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.fill();
    }

    // soft wash painted under the orbs (deep glow on dark, sky tint on light)
    function paintWash(dark: boolean) {
      if (dark) {
        paintOrb(w * 0.22, h * 0.16, Math.max(w, h) * 0.8, [74, 86, 210], 0.42 * k);
        paintOrb(w * 0.84, h * 0.9, Math.max(w, h) * 0.7, [140, 96, 214], 0.34 * k);
        paintOrb(w * 0.6, h * 0.5, Math.max(w, h) * 0.6, [40, 200, 190], 0.2 * k);
      } else {
        paintOrb(w * 0.3, h * 0.2, Math.max(w, h) * 0.85, [180, 205, 255], 0.5 * k);
        paintOrb(w * 0.8, h * 0.85, Math.max(w, h) * 0.7, [210, 200, 240], 0.4 * k);
      }
    }

    function draw(now: number) {
      const dark = document.documentElement.classList.contains("dark");
      const orbs = dark ? DARK_ORBS : LIGHT_ORBS;
      const t = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const min = Math.min(w, h);
      // gentle global "breath" so the field feels alive (flowing, not flashing)
      const breath = 0.92 + 0.08 * Math.sin(t * 0.5);

      ctx!.clearRect(0, 0, w, h);

      ctx!.globalCompositeOperation = "source-over";
      paintWash(dark);

      ctx!.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const o of orbs) {
        const px = (pointer.x - 0.5) * (o.depth * SCALE);
        const py = (pointer.y - 0.5) * (o.depth * SCALE);
        const cx = (o.x + Math.sin(t * o.speed * Math.PI * 2 + o.phase) * o.ampX) * w + px;
        const cy = (o.y + Math.cos(t * o.speed * Math.PI * 2 + o.phase) * o.ampY) * h + py;
        paintOrb(cx, cy, o.r * min, o.hue, o.alpha * k * breath);
      }
      // soft glow trailing the cursor
      paintOrb(pointer.x * w, pointer.y * h, min * 0.26, dark ? [124, 140, 255] : [99, 138, 255], (dark ? 0.2 : 0.12) * k);

      ctx!.globalCompositeOperation = "source-over";
    }

    function loop(now: number) {
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    function onPointer(e: PointerEvent) {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    }
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduceMotion) raf = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener("resize", resize);

    // redraw a still frame when the theme toggles (covers the reduced-motion path)
    const themeObserver = new MutationObserver(() => draw(performance.now()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    if (reduceMotion) {
      draw(start);
    } else {
      window.addEventListener("pointermove", onPointer);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [k]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ filter: "blur(40px) saturate(1.3)", transform: "translateZ(0)" }}
    />
  );
}
