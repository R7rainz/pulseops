// Scalar API-reference theme mirroring PulseOps' design tokens (frontend
// app/globals.css). Light + dark are both defined so the docs' theme toggle
// tracks the main site: light = graphite-on-#f4f4f6, dark = brushed-silver on
// Pot Black (#161516). Status colors map to the app's up/down/degraded/info.
// Passed as Scalar's `configuration.customCss`.
export const scalarThemeCss = `
:root {
  --scalar-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --scalar-font-code: ui-monospace, "Geist Mono", "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
  --scalar-radius: 0.625rem;
  --scalar-radius-lg: 0.875rem;
}

/* ── Light (matches :root in globals.css) ─────────────────────────── */
.light-mode {
  --scalar-background-1: #f4f4f6;
  --scalar-background-2: #ffffff;
  --scalar-background-3: #ececef;
  --scalar-background-accent: rgba(47, 50, 55, 0.10);

  --scalar-color-1: #2c2c2c;
  --scalar-color-2: #5e5e66;
  --scalar-color-3: #8a8a90;
  --scalar-color-accent: #2f3237;

  --scalar-border-color: #e3e3e7;

  --scalar-button-1: #2f3237;
  --scalar-button-1-color: #ffffff;
  --scalar-button-1-hover: #43464c;

  --scalar-color-green: #1f9d63;
  --scalar-color-red: #d64550;
  --scalar-color-orange: #b9740c;
  --scalar-color-yellow: #b9740c;
  --scalar-color-blue: #357578;

  --scalar-sidebar-background-1: #ffffff;
  --scalar-sidebar-color-1: #2c2c2c;
  --scalar-sidebar-color-2: #5e5e66;
  --scalar-sidebar-border-color: #e3e3e7;
  --scalar-sidebar-item-hover-background: #ececef;
  --scalar-sidebar-item-hover-color: #161616;
  --scalar-sidebar-item-active-background: rgba(47, 50, 55, 0.10);
  --scalar-sidebar-color-active: #2f3237;
  --scalar-sidebar-search-background: #ffffff;
  --scalar-sidebar-search-border-color: #e3e3e7;
  --scalar-sidebar-search--color: #5e5e66;
}

/* ── Dark (matches .dark in globals.css — default) ────────────────── */
.dark-mode {
  --scalar-background-1: #161516;
  --scalar-background-2: #1e1b1e;
  --scalar-background-3: #2c282c;
  --scalar-background-accent: rgba(203, 208, 215, 0.12);

  --scalar-color-1: #ece7ea;
  --scalar-color-2: #a79fa5;
  --scalar-color-3: #7d757b;
  --scalar-color-accent: #cbd0d7;

  --scalar-border-color: #3d3f43;

  --scalar-button-1: #cbd0d7;
  --scalar-button-1-color: #17171a;
  --scalar-button-1-hover: #dfe3e8;

  --scalar-color-green: #86d9ad;
  --scalar-color-red: #f4707e;
  --scalar-color-orange: #f2c879;
  --scalar-color-yellow: #f2c879;
  --scalar-color-blue: #a8dadc;

  --scalar-sidebar-background-1: #1a181a;
  --scalar-sidebar-color-1: #ece7ea;
  --scalar-sidebar-color-2: #a79fa5;
  --scalar-sidebar-border-color: #3d3f43;
  --scalar-sidebar-item-hover-background: #2c282c;
  --scalar-sidebar-item-hover-color: #ffffff;
  --scalar-sidebar-item-active-background: rgba(203, 208, 215, 0.12);
  --scalar-sidebar-color-active: #e8eaee;
  --scalar-sidebar-search-background: #1e1b1e;
  --scalar-sidebar-search-border-color: #3d3f43;
  --scalar-sidebar-search--color: #a79fa5;
}
`;
