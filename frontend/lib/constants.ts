const FALLBACK = "http://127.0.0.1:4000";

export const API_URL = typeof window === "undefined"
  ? (process.env.API_URL || FALLBACK)
  : (process.env.NEXT_PUBLIC_API_URL || FALLBACK);
