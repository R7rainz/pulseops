"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * AnimatedHeadline — GSAP word-by-word "mask reveal" on mount.
 * `lead` renders in the foreground colour, `accent` in the primary colour.
 * Reduced-motion: renders immediately, no animation.
 */
function words(text: string, className?: string) {
  const parts = text.split(" ");
  return parts.map((w, i) => (
    <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
      <span data-word className={cn("inline-block", className)}>
        {w}
        {i < parts.length - 1 ? " " : ""}
      </span>
    </span>
  ));
}

export default function AnimatedHeadline({
  lead,
  accent,
  className,
}: {
  lead: string;
  accent: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-word]", {
        yPercent: 115,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.055,
        delay: 0.05,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <h1 ref={ref} className={className}>
      {words(lead)} {words(accent, "text-primary")}
    </h1>
  );
}
