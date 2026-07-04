const FALLBACK = "http://127.0.0.1:4000";

export const API_URL = typeof window === "undefined"
  ? (process.env.API_URL || FALLBACK)
  : (process.env.NEXT_PUBLIC_API_URL || FALLBACK);

// Standalone docs app (see /docs package) — rendered separately so its Scalar
// UI isn't affected by the app's global styles.
export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";
