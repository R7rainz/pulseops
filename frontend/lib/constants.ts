const FALLBACK = "http://127.0.0.1:4000";

export const API_URL = typeof window === "undefined"
  ? (process.env.API_URL || FALLBACK)
  : (process.env.NEXT_PUBLIC_API_URL || FALLBACK);

// API docs live on Mintlify (hosted, git-synced from /docs). Set
// NEXT_PUBLIC_DOCS_URL to the real site URL in each deploy environment.
export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || "https://pulseops.mintlify.app";
