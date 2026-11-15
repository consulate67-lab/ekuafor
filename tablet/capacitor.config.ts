import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Tablet APK: web varlıkları APK içine gömülür (offline-first).
 * Canlı URL yok — kurulum/personel/foto tablette kalır.
 */
const config: CapacitorConfig = {
  appId: 'com.saloon.tablet',
  appName: 'Saloon Tablet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
