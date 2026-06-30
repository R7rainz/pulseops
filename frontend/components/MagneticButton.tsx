"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * MagneticButton — GSAP "magnetic" hover: the button eases toward the cursor
 * and springs back on leave. Honors reduced-motion (no transform).
 */
export default function MagneticButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power3.out" });
  }
  function onLeave() {
    if (!ref.current || reduce) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
  }

  return (
    <Link ref={ref} href={href} onMouseMove={onMove} onMouseLeave={onLeave} className={cn("will-change-transform", className)}>
      {children}
    </Link>
  );
}
