const FALLBACK = "http://127.0.0.1:4000";

export const API_URL = typeof window === "undefined"
  ? (process.env.API_URL || FALLBACK)
  : (process.env.NEXT_PUBLIC_API_URL || FALLBACK);

// Compose runs Next in production mode even for local HTTP development.
// Secure cookies must follow the public URL, not NODE_ENV alone.
export const SECURE_COOKIES = process.env.APP_URL
  ? process.env.APP_URL.startsWith("https://")
  : process.env.NODE_ENV === "production";

// Standalone docs app (see /docs package) — rendered separately so its Scalar
// UI isn't affected by the app's global styles.
export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";
