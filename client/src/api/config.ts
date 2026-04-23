import { Capacitor } from "@capacitor/core";

/**
 * Returns the base API URL for the current platform.
 *
 * In development: always use relative "/api" — works for all platforms because:
 *   - Web: Vite proxy forwards /api → localhost:3001
 *   - iOS simulator: WebView loads from localhost:5173, Vite proxy forwards
 *   - Android emulator: WebView loads from 10.0.2.2:5173, Vite proxy forwards
 *
 * In production: native apps need an absolute URL to the API server.
 */
export function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }

  // In dev mode, always use relative path — Vite proxy handles everything
  if (import.meta.env.DEV) {
    return "/api";
  }

  // Production native apps need absolute URL
  if (Capacitor.isNativePlatform()) {
    return (import.meta.env.VITE_NATIVE_API_URL as string) || "https://api.spendlens.app/api";
  }

  return "/api";
}
