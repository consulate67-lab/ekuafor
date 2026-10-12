import { CapacitorConfig } from '@capacitor/cli';

const LIVE_URL = 'https://web-production-db847.up.railway.app';

const config: CapacitorConfig = {
    appId: 'com.saloncebinde.app',
    appName: 'Saloon',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        // Ekranlar canlı siteden yüklenir; deploy yeni APK gerektirmeden telefona yansır.
        url: LIVE_URL,
        cleartext: false,
        allowNavigation: [new URL(LIVE_URL).host],
        // Canlı site açılamazsa (internet yok) gömülü sayfa gösterilir.
        errorPath: 'offline.html',
    },
};

export default config;
