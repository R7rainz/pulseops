"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Aurora — an immersive, soothing backdrop of slow-drifting light orbs in the
 * arctic-blue palette, rendered to a downscaled canvas and CSS-blurred (cheap
 * and dreamy). The field leans subtly toward the pointer and a faint glow
 * trails the cursor. Honors `prefers-reduced-motion` (one still frame).
 *
 * Tuned for the LIGHT theme: saturated cool orbs painted with normal blending
 * (additive "lighter" would wash to white on a light page). A faint static
 * gradient sits behind the canvas so there's colour before the first paint.
 *
 * Drop-in for the old AmbientGlow: same `{ className, tone }` API.
 */
interface Orb {
  hue: readonly [number, number, number];
  x: number; // base position 0..1
  y: number;
  r: number; // radius as fraction of min dimension
  ampX: number;
  ampY: number;
  speed: number;
  phase: number;
  depth: number; // parallax strength
  alpha: number;
}

const AZURE = [99, 138, 255] as const; // brand blue (#638AFF)
const SKY = [56, 189, 248] as const; // --info sky (#38BDF8)
const PERIWINKLE = [150, 178, 240] as const; // soft periwinkle
const LAVENDER = [179, 156, 208] as const; // cool lavender
const CYAN = [168, 218, 220] as const; // arctic cyan

const ORBS: Orb[] = [
  { hue: AZURE, x: 0.24, y: 0.28, r: 0.58, ampX: 0.05, ampY: 0.04, speed: 0.05, phase: 0, depth: 30, alpha: 0.42 },
  { hue: SKY, x: 0.76, y: 0.34, r: 0.5, ampX: 0.045, ampY: 0.05, speed: 0.042, phase: 1.7, depth: 42, alpha: 0.36 },
  { hue: PERIWINKLE, x: 0.5, y: 0.8, r: 0.62, ampX: 0.06, ampY: 0.035, speed: 0.035, phase: 3.1, depth: 22, alpha: 0.34 },
  { hue: LAVENDER, x: 0.88, y: 0.78, r: 0.42, ampX: 0.04, ampY: 0.045, speed: 0.03, phase: 4.4, depth: 34, alpha: 0.28 },
  { hue: CYAN, x: 0.12, y: 0.74, r: 0.46, ampX: 0.05, ampY: 0.04, speed: 0.038, phase: 2.2, depth: 26, alpha: 0.3 },
];

export default function Aurora({
  className,
  tone = "subtle",
}: {
  className?: string;
  tone?: "subtle" | "vivid";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const k = tone === "vivid" ? 1 : 0.72; // intensity factor

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

    function draw(now: number) {
      const t = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const min = Math.min(w, h);

      ctx!.clearRect(0, 0, w, h);
      // normal blending — saturated cool orbs read as soft washes on light bg
      for (const o of ORBS) {
        const px = (pointer.x - 0.5) * (o.depth * SCALE);
        const py = (pointer.y - 0.5) * (o.depth * SCALE);
        const cx = (o.x + Math.sin(t * o.speed * Math.PI * 2 + o.phase) * o.ampX) * w + px;
        const cy = (o.y + Math.cos(t * o.speed * Math.PI * 2 + o.phase) * o.ampY) * h + py;
        paintOrb(cx, cy, o.r * min, o.hue, o.alpha * k);
      }

      // soft glow trailing the cursor
      paintOrb(pointer.x * w, pointer.y * h, min * 0.26, AZURE, 0.08 * k);
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

    if (reduceMotion) {
      draw(start);
    } else {
      window.addEventListener("pointermove", onPointer);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [k]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {/* faint static wash — colour before the canvas paints, and adds depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, #CFE2FF 0%, #DCE9FF 45%, #E9E3F6 100%)",
          opacity: 0.5 * k,
        }}
      />
      {/* animated orb field */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "blur(44px) saturate(1.2)", transform: "translateZ(0)" }}
      />
    </div>
  );
}
