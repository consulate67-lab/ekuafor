import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.saloncebimde.app',
    appName: 'Salon Cebimde',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
