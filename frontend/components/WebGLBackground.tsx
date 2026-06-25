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
  float alpha = grid * 0.25;

  gl_FragColor = vec4(gridColor, alpha);
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

      const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);

      const scene: THREE.Scene = new THREE.Scene();

      const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
        58, w / h, 0.1, 100
      );
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);

      const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(
        0x404040, 0.5
      );
      scene.add(ambientLight);

      const keyLight: THREE.DirectionalLight = new THREE.DirectionalLight(
        0x9fd8bd, 0.8
      );
      keyLight.position.set(5, 5, 5);
      scene.add(keyLight);

      const rimLight: THREE.DirectionalLight = new THREE.DirectionalLight(
        0xa3d1df, 0.4
      );
      rimLight.position.set(-3, 2, -5);
      scene.add(rimLight);

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
        transparent: true,
        depthWrite: false,
      });

      const geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(8, 6);
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
        camera.aspect = ww / hh;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", handleResize);

      function animate(time: number) {
        const t = time * 0.001;
        uniforms.uTime.value = t;
        uniforms.uMouse.value.set(mouseX * 0.3, -mouseY * 0.2);

        if (!reduceMotion) {
          const orbitRadius = 0.3;
          const orbitSpeed = 0.15;
          camera.position.x = Math.sin(t * orbitSpeed) * orbitRadius;
          camera.position.z =
            5 + Math.cos(t * orbitSpeed) * orbitRadius - orbitRadius;
          camera.lookAt(0, 0, 0);
        }

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
