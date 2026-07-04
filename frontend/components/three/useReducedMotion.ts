"use client";

import { useEffect, useState } from "react";

/**
 * Tracks `prefers-reduced-motion`. SSR-safe: returns `false` until mounted,
 * then reflects (and live-updates with) the OS setting.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
