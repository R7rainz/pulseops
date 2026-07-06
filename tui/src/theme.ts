/**
 * Theme system for the TUI. Ships several colour palettes that re-skin the
 * dashboard's accents (headers, borders, bars, charts, selection) while keeping
 * status colours semantic (up=green, down=red, …) so they always read clearly.
 *
 * `iris` — the app's cyan→indigo "Iris" accent — is the default and is also used
 * verbatim by the pre-dashboard auth screens (login / workspace picker) that
 * live outside the theme context. The keys `cyan`/`indigo` are the accent slots;
 * other themes reuse those slots with their own hues.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface Theme {
  /** Stable key, persisted to disk. */
  name: string;
  /** Human label shown in the picker. */
  label: string;
  /** Primary accent (borders, titles, selection arrow). */
  cyan: string;
  /** Secondary accent (section headings, bars). */
  indigo: string;
  /** Contrast ink used as foreground on an accent background. */
  ink: string;
  /** De-emphasised text. */
  muted: string;
  /** Primary body text. */
  text: string;
  /** Line colour for latency graphs / sparklines. */
  chart: string;
}

export const THEMES: Theme[] = [
  {
    name: "iris",
    label: "Iris",
    cyan: "#22d3ee",
    indigo: "#818cf8",
    ink: "#0b0f1a",
    muted: "gray",
    text: "#e5e7eb",
    chart: "#22d3ee",
  },
  {
    name: "ember",
    label: "Ember",
    cyan: "#fb923c",
    indigo: "#f43f5e",
    ink: "#1a0b0b",
    muted: "gray",
    text: "#fde8d7",
    chart: "#fbbf24",
  },
  {
    name: "matrix",
    label: "Matrix",
    cyan: "#22c55e",
    indigo: "#4ade80",
    ink: "#031107",
    muted: "#4b7a5a",
    text: "#c6f6d5",
    chart: "#22c55e",
  },
  {
    name: "grape",
    label: "Grape",
    cyan: "#c084fc",
    indigo: "#e879f9",
    ink: "#160b1a",
    muted: "gray",
    text: "#efe0fb",
    chart: "#c084fc",
  },
  {
    name: "nord",
    label: "Nord",
    cyan: "#88c0d0",
    indigo: "#81a1c1",
    ink: "#0b0f14",
    muted: "#4c566a",
    text: "#e5e9f0",
    chart: "#8fbcbb",
  },
  {
    name: "mono",
    label: "Mono",
    cyan: "#e5e7eb",
    indigo: "#9ca3af",
    ink: "#000000",
    muted: "gray",
    text: "#f3f4f6",
    chart: "#e5e7eb",
  },
];

/** The default theme, also imported statically by the auth screens. */
export const iris: Theme = THEMES[0];

export function themeByName(name: string | undefined): Theme {
  return THEMES.find((t) => t.name === name) ?? iris;
}

// --- persistence ----------------------------------------------------------
// Stored separately from credentials so API-key users can persist a theme too.

function settingsPath(): string {
  const base =
    process.env.PULSEOPS_CONFIG_DIR ||
    path.join(
      process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
      "pulseops",
    );
  return path.join(base, "tui.json");
}

interface Settings {
  theme?: string;
}

export function loadSettings(): Settings {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf8")) as Settings;
  } catch {
    return {};
  }
}

export function saveThemeName(name: string): void {
  try {
    const file = settingsPath();
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const current = loadSettings();
    fs.writeFileSync(
      file,
      JSON.stringify({ ...current, theme: name }, null, 2) + "\n",
    );
  } catch {
    // best-effort; a read-only home just means the theme won't persist
  }
}

// --- semantic status colours (theme-independent) --------------------------

/** Ink colour for a monitor/incident status token. */
export function statusColor(status: string): string {
  switch (status) {
    case "UP":
    case "RESOLVED":
      return "green";
    case "DOWN":
    case "OPEN":
      return "red";
    case "DEGRADED":
    case "ACKNOWLEDGED":
      return "yellow";
    case "PAUSED":
      return "gray";
    default:
      return "white";
  }
}

/** Colour an uptime percentage by SLA band. */
export function uptimeColor(pct: number): string {
  if (pct >= 99.9) return "green";
  if (pct >= 99) return "greenBright";
  if (pct >= 95) return "yellow";
  return "red";
}

/** Colour a latency in ms by a rough good/ok/slow band. */
export function latencyColor(ms: number | null | undefined): string {
  if (ms == null) return "gray";
  if (ms < 300) return "green";
  if (ms < 800) return "yellow";
  return "red";
}

export const DOT = "●";
export const ARROW = "▸";
