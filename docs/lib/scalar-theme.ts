// Maps Scalar's theme variables onto the docs app's color tokens (defined in
// app/globals.css). Because they reference var(--background) etc., the docs
// recolor live with the .dark class on <html> (the theme toggle), matching the
// main PulseOps app's palette.
export const scalarThemeCss = `
:root {
  --scalar-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --scalar-font-code: ui-monospace, "Geist Mono", "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
  --scalar-radius: 0.625rem;
  --scalar-radius-lg: 0.875rem;
}

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
`;
