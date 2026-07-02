"use client";

// Flips the `dark` class on <html> and persists to the shared `pulseops_theme`
// cookie so the choice carries between the docs and the main app. Because the
// Scalar theme maps to CSS vars that live on <html>, toggling recolors live.
export default function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    document.cookie = `pulseops_theme=${isDark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      style={{
        display: "inline-grid",
        placeItems: "center",
        height: 32,
        width: 32,
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "color-mix(in oklab, var(--background) 80%, transparent)",
        color: "var(--muted-foreground)",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
