import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.saloncebinde.app',
    appName: 'Salon Cebinde',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
