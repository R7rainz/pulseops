"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * CountUp — GSAP animates the number from 0 → `to` when it scrolls into view.
 * Reduced-motion: shows the final value immediately.
 */
export default function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: 0 };
    const render = () => {
      el.textContent = `${prefix}${obj.v.toFixed(decimals)}${suffix}`;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      obj.v = to;
      render();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.to(obj, { v: to, duration: 1.6, ease: "power2.out", onUpdate: render });
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, decimals, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {(0).toFixed(decimals)}
      {suffix}
    </span>
  );
}
