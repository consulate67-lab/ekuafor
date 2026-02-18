import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.saloon.app',
    appName: 'Saloon',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
