import { Capacitor } from '@capacitor/core';

const FALLBACK_API = 'https://web-production-db847.up.railway.app/api';

/**
 * Tablet API kökü.
 * - VITE_API_URL varsa onu kullan
 * - Native APK → Railway (veya env)
 * - Vite dev (5180) → Railway / env
 * - Web production (/tablet aynı origin) → /api
 */
export function apiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  try {
    if (Capacitor.isNativePlatform()) return FALLBACK_API;
  } catch {
    /* web */
  }

  if (typeof window !== 'undefined') {
    const { port, origin } = window.location;
    // Yerel Vite — API ayrı origin
    if (port === '5180' || port === '4173') return FALLBACK_API;
    return `${origin}/api`;
  }

  return FALLBACK_API;
}
