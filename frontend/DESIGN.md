## Theme — Solarized Osaka

**Dark (default):** a **near-black** base (`--background #00090C`) with **teal-tinted surfaces**
(`--card #001A21`, `--surface #00131A`, teal hairline `--border #063540`), over which sits one
telemetry accent — the **Blue→Cyan signal** (`--signal-indigo #268BD3` [Osaka blue] →
`--signal-cyan #29A298`, mid `--signal #2B8FD0`). `--primary`/`--ring` point at the signal, so
buttons, focus, cursor spotlight and shells inherit it. Status = semantic Solarized Osaka
(up `#849900`, degraded `#B28500`, down `#DB302D`) and never part of the accent ramp. The
teal `--accent-*`/`--sheen-*` ramps drive decorative washes + `AmbientGlow`.

**Light:** **Solarized Osaka Dawn** — warm paper base (`--background #FDF5E2`), ink `#576D74`,
same Blue→Cyan signal + status accents.

> Token names are kept from the previous "Iris" system (`--signal-indigo` now holds Osaka
> **blue**; `*-iris` utilities are retargeted, not renamed) so nothing downstream broke.

**Cards:** `.glass` (teal-tinted translucent + blur + teal inset highlight) is the single card
chokepoint; `.glass-raised` for KPI tiles/modals; `.card-hover-signal` for lift + signal border
glow. **Ambient (always-on, non-hover) motion:** `.ambient-sweep` (conic signal light around a
card border via masked ring), `.ambient-sheen` + a baked sheen on `.btn-primary`,
`.ambient-glow-drift` — all reduced-motion gated.

**WebGL:** `components/three/` — (1) the hero **`NetworkGraph`** (fluid node-network, Osaka
colors) via `HeroSignature`; (2) the **`ShaderCard`** / `FlowFieldScene` — a fullscreen GLSL
value-noise flow used as the large cell of the landing features bento. Both are code-split
(`next/dynamic ssr:false`), `aria-hidden`, gated behind `useReducedMotion` + `useCapability`
(CSS fallback), and pause off-screen. Charts read `--signal`/`--signal-indigo` via
`lib/useThemeColors.ts`.

Tokens live in `app/globals.css` (the `.dark` block for dark, the light `:root` block for
light). `@theme inline` maps them to Tailwind utilities (`bg-card`, `text-primary`,
`text-accent-light`, etc.). Components consume the token names, so re-pointing a token
re-themes the whole app.

### Base / Neutral Scale

Backgrounds, surfaces, and structural elements — darkest to lightest.

| Token | Hex (dark) | Name | Usage |
|---|---|---|---|
| `--background` | `#161516` | Pot Black | Primary app background |
| `--card` / `--popover` / `--surface-raised` | `#2C282C` | Black Onyx | Cards, panels, modals |
| `--surface` | `#1E1B1E` | — | Subtle raise off the base |
| `--border` / `--input` | `#3D3F43` | Dark Elf | Borders, dividers, muted UI |

### Accent Scale (metallic)

Gradient stops for highlights, active states, and data-viz. Ordered dark → light.

| Token | Hex (dark) | Name | Usage |
|---|---|---|---|
| `--accent-deep` | `#565961` | Steel | Gradient base, low-emphasis accent |
| `--accent-mid` | `#9AA0AA` | Silver | Gradient midpoint, active/selected states |
| `--accent-light` | `#E8EAEE` | Near-white | Gradient highlight, glow, key numbers |
| `--primary` / `--ring` | `#CBD0D7` | Brushed Silver | Brand accent — buttons, links, focus rings |

`--primary-foreground` is `#17171A` (dark text on the silver CTA).

### Sheen Scale (background only)

Decorative background gradients (`AmbientGlow`, the landing hero) use a **separate**
`--sheen-*` scale so the ambient glow can differ from the UI accent. Dark values: steel
`#565961` → silver `#9AA0AA` → white `#F2F3F5`. The `mid`/`deep` tones are used for the
main blobs (they read on both black and white); `light` is the bright dark-mode specular.

### Gradient System

```css
--gradient-signal: linear-gradient(135deg, var(--accent-deep) 0%, var(--accent-mid) 50%, var(--accent-light) 100%);
--gradient-glow: radial-gradient(circle at 30% 0%, color-mix(in oklab, var(--accent-light) 30%, transparent), transparent 60%);
```

Reusable utility classes (in `@layer components`, `app/globals.css`):

- `.gradient-signal` — diagonal metallic fill for hero/header backdrops, stat washes
- `.text-gradient-signal` — gradient-clipped text for key metric numbers
- `.border-gradient-signal` — 1px gradient frame for a card/panel
- `.gradient-glow` — soft radial accent wash layered behind content (`::before`)
- `.card-active` — glow wash + accent border for active/selected state (not a solid fill)

### Status Colours (semantic — unchanged)

| Token | Hex (dark) | Meaning |
|---|---|---|
| `--up` | `#86D9AD` | Operational (green) |
| `--degraded` | `#F2C879` | Degraded (amber) |
| `--down` / `--destructive` | `#F4707E` | Down / error (red) |
| `--info` | `#A8DADC` | Info |
| `--paused` | `#A79FA5` | Paused |

Never recolour status into the metallic ramp — up/down/degraded must stay conventional.

### Light Mode

Same system inverted for legibility on the near-white `#F4F4F6` base:

- **Accent / primary → graphite**: `--primary` / `--ring` `#2F3237`; accent scale
  `#33363B` (graphite) → `#6B6F76` (steel) → `#9AA0AA` (silver). Dark-on-light so buttons
  and gradient text stay readable.
- **Sheen → steel grays** `#5C6069` / `#8B909A` / `#C2C6CD` (clearly darker than the base
  so the background gradient is visible on white).
- Status colours keep their light-tuned semantic values (`--up #1F9D63`, etc.).

### Component Rules

- Cards: `--card` (Onyx) on `--background` (Pot Black), `1px solid --border` (Dark Elf).
- Active/selected card or nav item: gradient border or `--gradient-glow` wash — not a solid
  accent fill.
- Key metrics/numbers: `.text-gradient-signal` or `--accent-light`, optionally over
  `--gradient-glow`.
- Charts: the response-time trend line uses `--gradient-signal` (deep → light); status
  encodings (pie slices, DOWN/DEGRADED dots) stay semantic. Charts read tokens at runtime
  via `lib/useThemeColors.ts` (recharts SVG can't resolve `var()`).
- Background: black base + metallic sheen from `AmbientGlow` — glows stay in the corners,
  the base never washes out. `prefers-reduced-motion` calms the drift.
- Avoid accent-on-accent — gradients sit on neutral surfaces only, never stacked.
