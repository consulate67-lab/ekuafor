import { Capacitor } from '@capacitor/core';

/** APK: offline-first yerel depolama. Tarayıcı: Railway board state. */
export function isNativeTablet(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Web (FTP / /tablet / localhost Vite) — sunucu kaynaklı */
export function isWebServerFirst(): boolean {
  return !isNativeTablet();
}
