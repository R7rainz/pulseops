"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { NetworkGraph } from "./NetworkGraph";

/**
 * WebGL signature Canvas. DPR-capped, alpha (transparent) so the metallic void
 * behind shows through, single restrained Bloom pass on the emissive nodes.
 * `paused` flips the render loop off (`frameloop="never"`) when the hero is
 * scrolled out of view — no wasted rAF. Default export so it can be lazily
 * `next/dynamic({ ssr: false })`-imported and code-split out of first paint.
 */
export default function SignatureScene({ paused = false }: { paused?: boolean }) {
  return (
    <Canvas
      aria-hidden
      dpr={[1, 2]}
      frameloop={paused ? "never" : "always"}
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <NetworkGraph />
      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  );
}
