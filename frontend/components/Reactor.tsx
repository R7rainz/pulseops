"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Reactor — the landing-hero signature (WebGL / three.js).
 *
 * A glowing core (wireframe icosahedron + inner solid) inside a thin ring, with
 * a stream of particles spiralling inward and respawning at the rim — a reactor
 * pulling energy in. Slow breathing pulse + pointer parallax. Tuned for a LIGHT
 * background (saturated blue/indigo/cyan, normal blending — not additive glow).
 *
 * Transparent clear so the page background and DOM glow show through. Honors
 * prefers-reduced-motion (one static frame), clamps DPR, pauses when hidden,
 * and disposes GPU resources on unmount.
 */
export default function Reactor({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = mount.clientWidth || window.innerWidth;
    let h = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 100);
    camera.position.z = 8.5;

    const BLUE = new THREE.Color("#2563eb");
    const SKY = new THREE.Color("#0ea5e9");
    const INDIGO = new THREE.Color("#4f46e5");
    const palette = [BLUE, SKY, INDIGO];

    // ── Core: wireframe shell + inner solid ──
    const core = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.3, 1),
      new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.45 }),
    );
    const innerMat = new THREE.MeshBasicMaterial({ color: SKY, transparent: true, opacity: 0.9 });
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 2), innerMat);
    core.add(shell, inner);
    scene.add(core);

    // ── Ring ──
    const ringMat = new THREE.MeshBasicMaterial({ color: INDIGO, transparent: true, opacity: 0.55 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.014, 12, 160), ringMat);
    ring.rotation.x = Math.PI / 2.3;
    scene.add(ring);

    // ── Particle stream (spiral inward) ──
    const COUNT = 3400;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const radii = new Float32Array(COUNT);
    const angles = new Float32Array(COUNT);
    const heights = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);

    function place(i: number, atRim: boolean) {
      radii[i] = atRim ? 4.2 + Math.random() * 3.6 : 0.3 + Math.random() * 7.4;
      angles[i] = Math.random() * Math.PI * 2;
      heights[i] = (Math.random() - 0.5) * 1.8;
      speeds[i] = 0.004 + Math.random() * 0.012;
    }
    for (let i = 0; i < COUNT; i++) {
      place(i, false);
      const c = palette[(Math.random() * palette.length) | 0];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, pMat);
    scene.add(points);

    function step() {
      for (let i = 0; i < COUNT; i++) {
        radii[i] -= speeds[i];
        angles[i] += 0.01 * (1 + (3 - Math.min(radii[i], 3)) * 0.18);
        if (radii[i] < 0.22) place(i, true);
        const r = radii[i];
        const a = angles[i];
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = heights[i] * (r / 4) + Math.sin(a * 1.4) * 0.05;
        positions[i * 3 + 2] = Math.sin(a) * r;
      }
      geo.attributes.position.needsUpdate = true;
    }

    // ── Pointer parallax ──
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    function onPointer(e: PointerEvent) {
      ptr.tx = e.clientX / window.innerWidth - 0.5;
      ptr.ty = e.clientY / window.innerHeight - 0.5;
    }

    const clock = new THREE.Clock();
    let raf = 0;

    function render() {
      const t = clock.getElapsedTime();
      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;
      step();
      const pulse = 1 + Math.sin(t * 1.2) * 0.06;
      core.scale.setScalar(pulse);
      core.rotation.y = t * 0.25;
      core.rotation.x = t * 0.12;
      ring.rotation.z = t * 0.16;
      ringMat.opacity = 0.42 + Math.sin(t * 1.2) * 0.16;
      scene.rotation.y = ptr.x * 0.4;
      scene.rotation.x = ptr.y * 0.25;
      renderer.render(scene, camera);
    }

    function loop() {
      render();
      raf = requestAnimationFrame(loop);
    }

    function resize() {
      w = mount!.clientWidth || window.innerWidth;
      h = mount!.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);

    if (reduce) {
      step();
      renderer.render(scene, camera);
    } else {
      window.addEventListener("pointermove", onPointer);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
      geo.dispose();
      pMat.dispose();
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
      inner.geometry.dispose();
      innerMat.dispose();
      ring.geometry.dispose();
      ringMat.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className={className ?? "absolute inset-0"} />;
}
