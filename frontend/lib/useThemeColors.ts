"use client";

import { useEffect, useState } from "react";

/**
 * useThemeColors — read the current theme's design tokens as concrete hex/rgb
 * values at runtime.
 *
 * recharts renders SVG presentation attributes (stroke/fill), which do NOT
 * resolve `var(--token)` — so charts can't reference CSS variables directly.
 * This hook reads the computed custom properties off <html> on mount and
 * re-reads whenever the `.dark` class toggles (theme switch), keeping charts
 * theme-aware. The defaults below are the dark (Sleek v2) values, used for the
 * first paint / SSR before the effect runs.
 */
const TOKENS = {
  accentDeep: "--accent-deep",
  accentMid: "--accent-mid",
  accentLight: "--accent-light",
  up: "--up",
  down: "--down",
  degraded: "--degraded",
  border: "--border",
  mutedForeground: "--muted-foreground",
  card: "--card",
  foreground: "--foreground",
} as const;

export type ThemeColors = Record<keyof typeof TOKENS, string>;

const FALLBACK: ThemeColors = {
  accentDeep: "#745a67",
  accentMid: "#b16d96",
  accentLight: "#ebaeb6",
  up: "#86d9ad",
  down: "#f4707e",
  degraded: "#f2c879",
  border: "#3d3f43",
  mutedForeground: "#a79fa5",
  card: "#2c282c",
  foreground: "#ece7ea",
};

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const next = {} as ThemeColors;
      (Object.keys(TOKENS) as (keyof typeof TOKENS)[]).forEach((key) => {
        const value = style.getPropertyValue(TOKENS[key]).trim();
        next[key] = value || FALLBACK[key];
      });
      setColors(next);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
