export type ToastType = "success" | "error" | "info";

export interface ToastData {
  message: string;
  type: ToastType;
}

export const TOAST_COOKIE = "pulseops_toast";

export function setToastCookie(message: string, type: ToastType = "success"): string {
  return `${TOAST_COOKIE}=${encodeURIComponent(JSON.stringify({ message, type }))}; Path=/; Max-Age=5; SameSite=Lax`;
}

export function parseToastCookie(value: string | undefined): ToastData | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

export const CLEAR_TOAST_HEADER = `${TOAST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
