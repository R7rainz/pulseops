"use client";

import { useEffect, useState } from "react";

type Capability = "unknown" | "capable" | "fallback";

/**
 * Lightweight GPU/device gate for the WebGL signature. No external deps — probes
 * for a real WebGL context and screens out low-power / small-screen / low-core
 * devices so they get the cheap CSS fallback instead of a heavy canvas.
 *
 * SSR-safe: returns "unknown" until mounted (render the fallback meanwhile),
 * then resolves to "capable" or "fallback".
 */
export function useCapability(): Capability {
  const [cap, setCap] = useState<Capability>("unknown");

  useEffect(() => {
    // 1. WebGL must actually be creatable.
    let gl: WebGLRenderingContext | null = null;
    try {
      const canvas = document.createElement("canvas");
      gl =
        (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
    } catch {
      gl = null;
    }
    if (!gl) {
      setCap("fallback");
      return;
    }

    // 2. Screen out low-power devices.
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 4;
    const memory = nav.deviceMemory ?? 4;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 640;
    const lowPower = cores <= 3 || memory <= 3 || (coarse && smallScreen);

    setCap(lowPower ? "fallback" : "capable");
  }, []);

  return cap;
}
