---
version: "alpha"
name: "Nexus — Volumetric Interfaces"
description: "Nexus Volumetric Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "#9FD8BD"
  secondary: "#E2A356"
  tertiary: "#A3D1DF"
  neutral: "#93A096"
  background: "#9FD8BD"
  surface: "#EEEAE0"
  text-primary: "#93A096"
  text-secondary: "#EEEAE0"
  border: "#EEEAE0"
  accent: "#9FD8BD"
typography:
  display-lg:
    fontFamily: "Bricolage Grotesque"
    fontSize: "112.417px"
    fontWeight: 230
    lineHeight: "110.167px"
    letterSpacing: "-0.035em"
  body-md:
    fontFamily: "Instrument Sans"
    fontSize: "12.8px"
    fontWeight: 400
    lineHeight: "19.2px"
  label-md:
    fontFamily: "Instrument Sans"
    fontSize: "14.4px"
    fontWeight: 500
    lineHeight: "22.3167px"
    letterSpacing: "0.144px"
rounded:
  md: "0px"
  full: "999px"
spacing:
  base: "4px"
  sm: "4px"
  md: "4.8px"
  lg: "5.6px"
  xl: "6.75px"
  gap: "9.6px"
  card-padding: "12px"
  section-padding: "29.6px"
components:
  button-primary:
    backgroundColor: "{colors.surface}"
    textColor: "#0A0F0C"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "15.2px"
  button-secondary:
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
    padding: "8.8px"
  button-link:
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: "4px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses light mode with #9FD8BD as the main accent and #93A096 as the neutral foundation.

- **Primary (#9FD8BD):** Main accent and emphasis color.
- **Secondary (#E2A356):** Supporting accent for secondary emphasis.
- **Tertiary (#A3D1DF):** Reserved accent for supporting contrast moments.
- **Neutral (#93A096):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #9FD8BD; Surface: #EEEAE0; Text Primary: #93A096; Text Secondary: #EEEAE0; Border: #EEEAE0; Accent: #9FD8BD

## Typography

Typography pairs Bricolage Grotesque for display hierarchy with Instrument Sans for supporting content and interface copy.

- **Display (`display-lg`):** Bricolage Grotesque, 112.417px, weight 230, line-height 110.167px, letter-spacing -0.035em.
- **Body (`body-md`):** Instrument Sans, 12.8px, weight 400, line-height 19.2px.
- **Labels (`label-md`):** Instrument Sans, 14.4px, weight 500, line-height 22.3167px, letter-spacing 0.144px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 4.8px, 5.6px, 6.75px, 8.8px, 9.6px, 14.4px, 15.2px
- **Section padding:** 29.6px, 36.8px, 42.75px
- **Card padding:** 12px
- **Gaps:** 9.6px, 10.4px, 16px, 17.6px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #EEEAE0; 1px #E2A356
- **Shadows:** rgba(159, 216, 189, 0.377) 0px 0px 0px 1.45954px; rgba(238, 234, 224, 0.25) 0px 8px 30px -10px
- **Blur:** 6px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 0px padding and a 0px radius. Drive the shell with radial-gradient(rgba(226, 163, 86, 0.2) 0%, rgba(226, 163, 86, 0.06) 32%, rgba(0, 0, 0, 0) 64%) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 4px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 4px, 9px, 999px

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #EEEAE0, text #0A0F0C, radius 999px, padding 15.2px, border 0px rgb(10, 15, 12).
- **Secondary:** text #93A096, radius 999px, padding 8.8px, border 1px solid rgba(238, 234, 224, 0.1).
- **Links:** text #93A096, radius 0px, padding 4px, border 0px rgb(147, 160, 150).

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 4px, 9px, 999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 300ms and 350ms. Easing favors ease and cubic-bezier(0.19. Scroll choreography uses Parallax for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 300ms, 350ms, 950ms, 1250ms, 9000ms, 2600ms

**Easings:** ease, cubic-bezier(0.19, 1, 0.22, 1), steps(6)

**Scroll Patterns:** parallax

## WebGL

Reconstruct the graphics as a full-bleed background field using webgl, renderer, antialias, dpr clamp, custom shaders. The effect should read as retro-futurist, technical, and meditative: perspective grid field with green on black and sparse spacing. Build it from grid lines + depth fade so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve reduced motion + dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field
  - **Effect:**
    - **Value:** Perspective grid field
  - **Primitives:**
    - **Value:** Grid lines + depth fade
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** WebGL, Renderer, antialias, DPR clamp, custom shaders

**Techniques:** Perspective grid, Breathing pulse, Pointer parallax, Shader gradients, Noise fields

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- Live procedural terrain — the product, running -->
      <canvas id="scene" aria-hidden="true"></canvas>
      <div class="glow-dawn" aria-hidden="true"></div>
      <div class="vignette" aria-hidden="true"></div>
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      (() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ============ Procedural terrain scene ============ */
        const canvas   = document.getElementById('scene');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x070B09, 1);
      …
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* ============ Procedural terrain scene ============ */
      const canvas   = document.getElementById('scene');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x070B09, 1);
      …
      ```

## ThreeJS

Reconstruct the Three.js layer as a full-bleed background field with layered spatial depth that feels retro-futurist and technical. Use antialias, dpr clamp renderer settings, perspective, ~58deg fov, plane geometry, shadermaterial materials, and ambient + key + rim lighting. Motion should read as slow orbital drift, with reduced motion + non-3d fallback.

**Id:** threejs

**Label:** ThreeJS

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field with layered spatial depth
  - **Render:**
    - **Value:** antialias, DPR clamp
  - **Camera:**
    - **Value:** Perspective, ~58deg FOV
  - **Lighting:**
    - **Value:** ambient + key + rim
  - **Materials:**
    - **Value:** ShaderMaterial
  - **Geometry:**
    - **Value:** plane
  - **Motion:**
    - **Value:** Slow orbital drift

**Techniques:** Shader materials, Timeline beats, antialias, DPR clamp, Reduced motion + non-3D fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- Live procedural terrain — the product, running -->
      <canvas id="scene" aria-hidden="true"></canvas>
      <div class="glow-dawn" aria-hidden="true"></div>
      <div class="vignette" aria-hidden="true"></div>
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      (() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ============ Procedural terrain scene ============ */
        const canvas   = document.getElementById('scene');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x070B09, 1);
      …
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* ============ Procedural terrain scene ============ */
      const canvas   = document.getElementById('scene');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x070B09, 1);
      …
      ```
