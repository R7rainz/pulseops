"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Fullscreen clip-space quad (camera-independent) with a flowing value-noise
// field in the Osaka Blue→Cyan signal over a near-black teal base. Cheap: one
// triangle-ish quad, no postprocessing.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorA;  // blue
  uniform vec3 uColorB;  // cyan
  uniform vec3 uBg;      // near-black teal

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.06;
    float n = fbm(uv * 3.0 + vec2(t, t * 0.6));
    float m = fbm(uv * 2.2 - vec2(t * 0.8, -t * 0.5) + n);
    float k = smoothstep(0.25, 0.9, m);
    vec3 col = mix(uColorA, uColorB, k);
    col = mix(uBg, col, 0.32 + 0.5 * k);          // keep a dark base
    float vign = smoothstep(1.15, 0.25, length(uv - 0.5));
    gl_FragColor = vec4(col * vign, 1.0);
  }
`;

function FlowMesh() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#268bd3") },
      uColorB: { value: new THREE.Color("#29a298") },
      uBg: { value: new THREE.Color("#001a21") },
    }),
    [],
  );
  useFrame((_, delta) => {
    if (mat.current) mat.current.uniforms.uTime.value += delta;
  });
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function FlowFieldScene({ paused = false }: { paused?: boolean }) {
  return (
    <Canvas
      aria-hidden
      frameloop={paused ? "never" : "always"}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <FlowMesh />
    </Canvas>
  );
}
