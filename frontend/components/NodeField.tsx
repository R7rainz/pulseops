"use client";

import { useEffect, useRef } from "react";

/**
 * NodeField — full-bleed animated background for PulseOps.
 *
 * A sparse network of nodes (monitors) connected by faint edges. Every so often
 * a pulse travels along an edge — a "check" firing — and flashes the node it
 * reaches. Slow ambient drift + subtle pointer parallax. Canvas 2D, no deps.
 *
 * - `variant="hero"`   → denser, brighter, with travelling pulses (landing/login/status).
 * - `variant="ambient"`→ sparse, dim, no pulses (inside the dashboard; stays out of the way).
 *
 * Honors `prefers-reduced-motion`: renders one static frame, no rAF loop.
 */
type Variant = "hero" | "ambient";

interface NodeFieldProps {
  variant?: Variant;
  className?: string;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number; // depth 0..1 — drives size/opacity (parallax)
  flash: number; // 0..1 decaying highlight when a pulse arrives
}

interface Pulse {
  a: number; // from-node index
  b: number; // to-node index
  t: number; // 0..1 progress along the edge
  speed: number;
}

const MINT = [159, 216, 189] as const; // --up  #9FD8BD
const INFO = [163, 209, 223] as const; // --info #A3D1DF

export default function NodeField({ variant = "hero", className }: NodeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = variant === "hero";

    // Tunables per variant
    const density = hero ? 0.00009 : 0.00005; // nodes per px²
    const linkDist = hero ? 168 : 150;
    const baseAlpha = hero ? 0.9 : 0.5;
    const maxNodes = hero ? 90 : 48;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let raf = 0;
    let lastPulse = 0;

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
      const count = Math.min(maxNodes, Math.max(14, Math.round(w * h * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        z: Math.random(),
        flash: 0,
      }));
      pulses = [];
    }

    function spawnPulse() {
      if (!hero || nodes.length < 2) return;
      const a = (Math.random() * nodes.length) | 0;
      // pick a nearby node as the target so the pulse rides a real edge
      let b = -1;
      let best = linkDist * linkDist;
      for (let i = 0; i < nodes.length; i++) {
        if (i === a) continue;
        const dx = nodes[a].x - nodes[i].x;
        const dy = nodes[a].y - nodes[i].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best && Math.random() < 0.5) {
          best = d2;
          b = i;
        }
      }
      if (b >= 0) pulses.push({ a, b, t: 0, speed: 0.012 + Math.random() * 0.01 });
    }

    function rgba(c: readonly number[], a: number) {
      return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      // eased pointer parallax
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      const px = (pointer.x - 0.5) * 26;
      const py = (pointer.y - 0.5) * 26;

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > linkDist) continue;
          const fade = (1 - dist / linkDist) * baseAlpha * 0.22;
          ctx!.strokeStyle = rgba(MINT, fade);
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(a.x + px * a.z, a.y + py * a.z);
          ctx!.lineTo(b.x + px * b.z, b.y + py * b.z);
          ctx!.stroke();
        }
      }

      // travelling pulses
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k];
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) {
          pulses.splice(k, 1);
          continue;
        }
        p.t += p.speed;
        const x = a.x + (b.x - a.x) * p.t + px * 0.6;
        const y = a.y + (b.y - a.y) * p.t + py * 0.6;
        ctx!.fillStyle = rgba(INFO, 0.9);
        ctx!.beginPath();
        ctx!.arc(x, y, 2, 0, Math.PI * 2);
        ctx!.fill();
        // glow
        ctx!.fillStyle = rgba(INFO, 0.18);
        ctx!.beginPath();
        ctx!.arc(x, y, 6, 0, Math.PI * 2);
        ctx!.fill();
        if (p.t >= 1) {
          b.flash = 1;
          pulses.splice(k, 1);
        }
      }

      // nodes
      for (const n of nodes) {
        const r = 0.7 + n.z * 1.8 + n.flash * 2.2;
        const a = (0.18 + n.z * 0.5) * baseAlpha + n.flash * 0.5;
        ctx!.fillStyle = rgba(MINT, Math.min(a, 1));
        ctx!.beginPath();
        ctx!.arc(n.x + px * n.z, n.y + py * n.z, r, 0, Math.PI * 2);
        ctx!.fill();
        if (n.flash > 0.01) {
          ctx!.fillStyle = rgba(MINT, n.flash * 0.14);
          ctx!.beginPath();
          ctx!.arc(n.x + px * n.z, n.y + py * n.z, r + 7, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function step(now: number) {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.flash *= 0.94;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      if (hero && now - lastPulse > 900) {
        lastPulse = now;
        if (Math.random() < 0.7) spawnPulse();
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
      else if (!reduceMotion) raf = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw(); // single static frame, no loop
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
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
