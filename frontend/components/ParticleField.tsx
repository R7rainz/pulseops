"use client";

import { useEffect, useRef } from "react";

/**
 * ParticleField — calm ambient background (Canvas 2D, no deps).
 *
 * Fine particles drifting with the faintest links between near neighbours — a
 * quiet echo of the reactor for in-app surfaces. Blue palette, low contrast so
 * it never competes with data. Pointer parallax, reduced-motion still frame,
 * pauses when the tab is hidden. Works on light or dark (colours are tuned for
 * light; opacity keeps it subtle either way).
 */
interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  c: readonly [number, number, number];
}

const BLUE = [37, 99, 235] as const;
const SKY = [14, 165, 233] as const;
const INDIGO = [79, 70, 229] as const;
const COLORS = [BLUE, SKY, INDIGO];

export default function ParticleField({
  className,
  density = 0.00006,
  max = 90,
  linkDist = 130,
}: {
  className?: string;
  density?: number;
  max?: number;
  linkDist?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let parts: P[] = [];
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let raf = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      const n = Math.min(max, Math.max(18, Math.round(w * h * density)));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        z: Math.random(),
        c: COLORS[(Math.random() * COLORS.length) | 0],
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      const px = (pointer.x - 0.5) * 24;
      const py = (pointer.y - 0.5) * 24;

      // links
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i];
          const b = parts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > linkDist) continue;
          ctx!.strokeStyle = `rgba(37,99,235,${(1 - d / linkDist) * 0.09})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(a.x + px * a.z, a.y + py * a.z);
          ctx!.lineTo(b.x + px * b.z, b.y + py * b.z);
          ctx!.stroke();
        }
      }
      // dots
      for (const p of parts) {
        const r = 0.8 + p.z * 1.6;
        ctx!.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${0.22 + p.z * 0.32})`;
        ctx!.beginPath();
        ctx!.arc(p.x + px * p.z, p.y + py * p.z, r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function step() {
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    function onPointer(e: PointerEvent) {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    }
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) raf = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);
    if (reduce) {
      draw();
    } else {
      window.addEventListener("pointermove", onPointer);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density, max, linkDist]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
