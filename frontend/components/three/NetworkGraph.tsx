"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const NODE_COUNT = 92;
const NEIGHBORS = 3; // edges per node (deduped)
const PULSES = 26; // telemetry "packets" travelling along edges
const RADIUS = 2.55;

const CYAN = new THREE.Color("#29a298"); // Osaka cyan
const INDIGO = new THREE.Color("#268bd3"); // Osaka blue (node gradient endpoint)
const STEEL = new THREE.Color("#0f6d76"); // teal edges
const PULSE = new THREE.Color("#7fe8de"); // bright cyan telemetry pulse

/** Even point distribution on a sphere (Fibonacci lattice). */
function fibonacciSphere(count: number, radius: number): Float32Array {
  const pts = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts[i * 3] = Math.cos(theta) * r * radius;
    pts[i * 3 + 1] = y * radius;
    pts[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return pts;
}

interface Pulse {
  a: number; // node index
  b: number; // node index
  t: number; // 0..1 progress
  speed: number;
}

/**
 * Fluid node-network graph — an organic mesh of nodes on a loose sphere shell
 * that drift, self-pulse, and route "telemetry packets" along their edges. The
 * whole form breathes and rotates on its own; a light cursor parallax tilts it.
 * CPU-animates node positions each frame and rebuilds the edge buffer from them
 * so nodes and links stay perfectly coupled (cheap at this vertex count).
 */
export function NetworkGraph({ dispersion = 0 }: { dispersion?: number }) {
  const group = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const { pointer } = useThree();

  // ── Static topology + per-node drift params (built once) ──────────
  const data = useMemo(() => {
    const base = fibonacciSphere(NODE_COUNT, RADIUS);

    // Per-node drift phase/speed/amplitude for organic floating.
    const drift = new Float32Array(NODE_COUNT * 4); // phase, speedX, speedY, amp
    for (let i = 0; i < NODE_COUNT; i++) {
      drift[i * 4] = Math.random() * Math.PI * 2;
      drift[i * 4 + 1] = 0.4 + Math.random() * 0.5;
      drift[i * 4 + 2] = 0.3 + Math.random() * 0.5;
      drift[i * 4 + 3] = 0.06 + Math.random() * 0.1;
    }

    // Node colors: interpolate cyan↔indigo across the sphere.
    const nodeColors = new Float32Array(NODE_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < NODE_COUNT; i++) {
      c.copy(CYAN).lerp(INDIGO, i / NODE_COUNT);
      nodeColors[i * 3] = c.r;
      nodeColors[i * 3 + 1] = c.g;
      nodeColors[i * 3 + 2] = c.b;
    }

    // Edges: connect each node to its NEIGHBORS nearest, deduped.
    const seen = new Set<string>();
    const edges: [number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < NODE_COUNT; j++) {
        if (i === j) continue;
        const dx = base[i * 3] - base[j * 3];
        const dy = base[i * 3 + 1] - base[j * 3 + 1];
        const dz = base[i * 3 + 2] - base[j * 3 + 2];
        dists.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      dists.sort((p, q) => p.d - q.d);
      for (let k = 0; k < NEIGHBORS; k++) {
        const j = dists[k].j;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([Math.min(i, j), Math.max(i, j)]);
      }
    }

    const positions = new Float32Array(base); // mutated per frame
    const linePositions = new Float32Array(edges.length * 6);

    const pulses: Pulse[] = [];
    for (let i = 0; i < PULSES; i++) {
      const [a, b] = edges[Math.floor(Math.random() * edges.length)];
      pulses.push({ a, b, t: Math.random(), speed: 0.25 + Math.random() * 0.5 });
    }
    const pulsePositions = new Float32Array(PULSES * 3);

    return { base, drift, nodeColors, edges, positions, linePositions, pulses, pulsePositions };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const { base, drift, edges, positions, linePositions, pulses, pulsePositions } = data;
    const spread = 1 + dispersion * 0.9; // gentle scatter as hero scrolls away

    // 1. Float every node around its base position.
    for (let i = 0; i < NODE_COUNT; i++) {
      const ph = drift[i * 4];
      const sx = drift[i * 4 + 1];
      const sy = drift[i * 4 + 2];
      const amp = drift[i * 4 + 3];
      positions[i * 3] = (base[i * 3] + Math.sin(t * sx + ph) * amp) * spread;
      positions[i * 3 + 1] = (base[i * 3 + 1] + Math.cos(t * sy + ph) * amp) * spread;
      positions[i * 3 + 2] = (base[i * 3 + 2] + Math.sin(t * sy * 0.8 + ph) * amp) * spread;
    }

    // 2. Rebuild edges from the floated node positions.
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];
      linePositions[e * 6] = positions[a * 3];
      linePositions[e * 6 + 1] = positions[a * 3 + 1];
      linePositions[e * 6 + 2] = positions[a * 3 + 2];
      linePositions[e * 6 + 3] = positions[b * 3];
      linePositions[e * 6 + 4] = positions[b * 3 + 1];
      linePositions[e * 6 + 5] = positions[b * 3 + 2];
    }

    // 3. Advance telemetry pulses along their edges.
    for (let p = 0; p < pulses.length; p++) {
      const pulse = pulses[p];
      pulse.t += delta * pulse.speed;
      if (pulse.t > 1) {
        const [a, b] = edges[Math.floor(Math.random() * edges.length)];
        pulse.a = a;
        pulse.b = b;
        pulse.t = 0;
        pulse.speed = 0.25 + Math.random() * 0.5;
      }
      const a = pulse.a;
      const b = pulse.b;
      const tt = pulse.t;
      pulsePositions[p * 3] = positions[a * 3] + (positions[b * 3] - positions[a * 3]) * tt;
      pulsePositions[p * 3 + 1] =
        positions[a * 3 + 1] + (positions[b * 3 + 1] - positions[a * 3 + 1]) * tt;
      pulsePositions[p * 3 + 2] =
        positions[a * 3 + 2] + (positions[b * 3 + 2] - positions[a * 3 + 2]) * tt;
    }

    // Flush buffers.
    if (pointsRef.current) {
      (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    if (linesRef.current) {
      (linesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    if (pulsesRef.current) {
      (pulsesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // 4. Self-rotation + light cursor parallax + subtle breathing.
    if (group.current) {
      group.current.rotation.y += delta * 0.05;
      const targetX = pointer.y * 0.18;
      const targetY = group.current.rotation.y + pointer.x * 0.28;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
      group.current.rotation.z = Math.sin(t * 0.1) * 0.04;
      // parallax on Y is layered on top of the constant spin
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.02;
      const breathe = 1 + Math.sin(t * 0.5) * 0.015;
      group.current.scale.setScalar(breathe * (1 - dispersion * 0.15));
    }
  });

  return (
    <group ref={group}>
      {/* edges */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.linePositions, 3]}
            count={data.edges.length * 2}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={STEEL}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.positions, 3]}
            count={NODE_COUNT}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[data.nodeColors, 3]}
            count={NODE_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.085}
          sizeAttenuation
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* telemetry pulses */}
      <points ref={pulsesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.pulsePositions, 3]}
            count={PULSES}
          />
        </bufferGeometry>
        <pointsMaterial
          color={PULSE}
          size={0.11}
          sizeAttenuation
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
