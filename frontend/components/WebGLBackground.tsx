"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform float uReducedMotion;

varying vec2 vUv;

void main() {
  vec2 uv = vUv + uMouse * 0.015;

  float persp = 1.0 / max(0.001, 1.0 - uv.y * 0.92);
  float spacing = 0.08;

  float depthCoord = fract(persp * 0.5);
  float depthLine = 1.0 - smoothstep(0.0, 0.006, min(depthCoord, 1.0 - depthCoord));

  float widthCoord = uv.x * persp;
  float widthFrac = fract(widthCoord / spacing);
  float widthLine = 1.0 - smoothstep(0.0, 0.006, min(widthFrac, 1.0 - widthFrac));

  float grid = max(depthLine, widthLine);

  float fade = 1.0 - uv.y;
  fade = pow(fade, 1.5);
  grid *= fade;

  float bottomFade = 1.0 - (1.0 - uv.y) * (1.0 - uv.y);
  grid *= bottomFade;

  float pulse = uReducedMotion > 0.5 ? 1.0 : 0.6 + 0.4 * sin(uTime * 0.4);
  grid *= pulse;

  vec3 gridColor = vec3(0.624, 0.847, 0.741);
  vec3 bgColor = vec3(0.027, 0.043, 0.035);
  vec3 color = mix(bgColor, gridColor, grid);

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let cleanup: (() => void) | null = null;

    async function init() {
      const THREE = await import("three");

      const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x070b09, 1);

      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);

      const scene: THREE.Scene = new THREE.Scene();

      const camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;

      const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uReducedMotion: { value: reduceMotion ? 1 : 0 },
      };

      const material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(2, 2);
      const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      let animationId = 0;
      let mouseX = 0;
      let mouseY = 0;

      const handleMouse = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("mousemove", handleMouse);

      const handleResize = () => {
        const ww = window.innerWidth;
        const hh = window.innerHeight;
        renderer.setSize(ww, hh);
      };
      window.addEventListener("resize", handleResize);

      function animate(time: number) {
        uniforms.uTime.value = time * 0.001;
        uniforms.uMouse.value.set(mouseX * 0.3, -mouseY * 0.2);
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      }

      if (!reduceMotion) {
        animationId = requestAnimationFrame(animate);
      } else {
        renderer.render(scene, camera);
      }

      cleanup = () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("mousemove", handleMouse);
        window.removeEventListener("resize", handleResize);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };
    }

    init();

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        id="scene"
        aria-hidden="true"
        className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      />
      <div
        className="fixed bottom-0 left-0 right-0 h-1/3 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(159,216,189,0.03) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
