"use client";

import { useEffect, useRef } from "react";

/**
 * Aurora — a soft, soothing background of slow-drifting light orbs in the
 * PulseOps palette over the near-black base. Calm by default (Claude / Zen
 * vibe): low contrast, gentle motion, nothing flashing.
 *
 * Interactive: the field leans subtly toward the pointer, and a faint glow
 * follows the cursor. Honors `prefers-reduced-motion` (renders one still frame).
 *
 * Rendered to a downscaled canvas and CSS-blurred — cheap and dreamy.
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

const MINT = [159, 216, 189] as const; // --up
const SKY = [163, 209, 223] as const; // --info
const TEAL = [86, 196, 160] as const; // deeper emerald-teal
const SAGE = [147, 160, 150] as const; // --paused

const ORBS: Orb[] = [
  { hue: MINT, x: 0.26, y: 0.3, r: 0.55, ampX: 0.05, ampY: 0.04, speed: 0.05, phase: 0, depth: 28, alpha: 0.6 },
  { hue: SKY, x: 0.74, y: 0.36, r: 0.5, ampX: 0.045, ampY: 0.05, speed: 0.042, phase: 1.7, depth: 40, alpha: 0.5 },
  { hue: TEAL, x: 0.52, y: 0.82, r: 0.6, ampX: 0.06, ampY: 0.035, speed: 0.035, phase: 3.1, depth: 20, alpha: 0.45 },
  { hue: SAGE, x: 0.9, y: 0.8, r: 0.4, ampX: 0.04, ampY: 0.045, speed: 0.03, phase: 4.4, depth: 32, alpha: 0.3 },
];

export default function Aurora({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx!.globalCompositeOperation = "lighter";

      for (const o of ORBS) {
        const px = (pointer.x - 0.5) * (o.depth * SCALE);
        const py = (pointer.y - 0.5) * (o.depth * SCALE);
        const cx = (o.x + Math.sin(t * o.speed * Math.PI * 2 + o.phase) * o.ampX) * w + px;
        const cy = (o.y + Math.cos(t * o.speed * Math.PI * 2 + o.phase) * o.ampY) * h + py;
        paintOrb(cx, cy, o.r * min, o.hue, o.alpha);
      }

      // soft glow following the cursor
      paintOrb(pointer.x * w, pointer.y * h, min * 0.28, MINT, 0.1);

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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
      style={{ filter: "blur(40px) saturate(1.15)", transform: "translateZ(0)" }}
    />
  );
}
