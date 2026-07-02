// Maps Scalar's theme variables onto PulseOps' own design tokens (the CSS
// custom properties defined in app/globals.css). Because these reference
// `var(--background)` etc., the embedded API docs recolor live with the app's
// light/dark toggle and use the same Geist/Instrument fonts — one source of
// truth, no separate palette to keep in sync.
export const scalarThemeCss = `
:root {
  --scalar-font: var(--font-sans), ui-sans-serif, system-ui, -apple-system, sans-serif;
  --scalar-font-code: var(--font-geist-mono), ui-monospace, "JetBrains Mono", Menlo, monospace;
  --scalar-radius: 0.625rem;
  --scalar-radius-lg: 0.875rem;
}

/* Drive both Scalar modes from the app tokens so it always matches whatever
   theme the app is in (html.dark), rather than Scalar's own mode state. */
.light-mode,
.dark-mode {
  --scalar-background-1: var(--background);
  --scalar-background-2: var(--surface);
  --scalar-background-3: var(--surface-raised);
  --scalar-background-accent: color-mix(in oklab, var(--primary) 14%, transparent);

  --scalar-color-1: var(--foreground);
  --scalar-color-2: var(--muted-foreground);
  --scalar-color-3: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
  --scalar-color-accent: var(--primary);

  --scalar-border-color: var(--border);

  --scalar-button-1: var(--primary);
  --scalar-button-1-color: var(--primary-foreground);
  --scalar-button-1-hover: color-mix(in oklab, var(--primary) 88%, var(--foreground));

  --scalar-color-green: var(--up);
  --scalar-color-red: var(--down);
  --scalar-color-orange: var(--degraded);
  --scalar-color-yellow: var(--degraded);
  --scalar-color-blue: var(--info);

  --scalar-sidebar-background-1: var(--surface);
  --scalar-sidebar-color-1: var(--foreground);
  --scalar-sidebar-color-2: var(--muted-foreground);
  --scalar-sidebar-border-color: var(--border);
  --scalar-sidebar-item-hover-background: var(--surface-raised);
  --scalar-sidebar-item-hover-color: var(--foreground);
  --scalar-sidebar-item-active-background: color-mix(in oklab, var(--primary) 14%, transparent);
  --scalar-sidebar-color-active: var(--primary);
  --scalar-sidebar-search-background: var(--surface);
  --scalar-sidebar-search-border-color: var(--border);
  --scalar-sidebar-search-color: var(--muted-foreground);
}

/* Scalar doesn't set its own height (the standalone host page normally does),
   so make its root fill the mount node. That gives the layout a bounded height
   and lets the sidebar stay fixed while the content column scrolls. */
.scalar-app,
.scalar-app .scalar-api-reference {
  height: 100%;
}
`;
