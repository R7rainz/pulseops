"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * SpotlightCard — a card that lifts on hover and renders a soft glow that
 * follows the cursor (via CSS custom props read by the `.spotlight` class).
 */
export default function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div ref={ref} onMouseMove={onMove} className={cn("spotlight", className)}>
      {children}
    </div>
  );
}
