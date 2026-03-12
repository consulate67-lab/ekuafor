import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.saloon.app',
    appName: 'SaloonTR',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
