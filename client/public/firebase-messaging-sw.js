importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCC-ig153i2vKrZIw35QX0S0pBqa6mkwJ8",
    authDomain: "saloon-fc5d1.firebaseapp.com",
    projectId: "saloon-fc5d1",
    storageBucket: "saloon-fc5d1.firebasestorage.app",
    messagingSenderId: "352301372208",
    appId: "1:352301372208:web:f3fd01419965613e346ef5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
