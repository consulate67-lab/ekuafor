import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyCC-ig153i2vKrZIw35QX0S0pBqa6mkwJ8",
    authDomain: "saloon-fc5d1.firebaseapp.com",
    projectId: "saloon-fc5d1",
    storageBucket: "saloon-fc5d1.firebasestorage.app",
    messagingSenderId: "352301372208",
    appId: "1:352301372208:web:f3fd01419965613e346ef5",
    measurementId: "G-1CL7BLTH2D"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestWebPushToken = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = 'BFVvj_X8E_X8E_X8E_X8E_X8E_X8E_X8E_X8E'; // Firebase'den alınan gerçek key buraya gelmeli

            // Eğer key placeholder ise getToken çağrılmasın
            if (vapidKey.includes('_X8E_')) {
                console.warn('Firebase VAPID key ayarlanmamış. Lütfen lib/firebase.ts dosyasını güncelleyin.');
                return null;
            }

            const token = await getToken(messaging, {
                vapidKey: vapidKey
            });
            return token;
        }
    } catch (error) {
        console.error('Web Push Token Hatası:', error);
    }
    return null;
};
