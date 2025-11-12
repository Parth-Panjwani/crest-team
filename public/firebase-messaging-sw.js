// Firebase Messaging Service Worker
// This file must be in the public directory

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

// Initialize Firebase
// Note: Service workers can't access import.meta.env, so we use hardcoded values
// These should match your .env file values
const firebaseConfig = {
  apiKey: "AIzaSyAW7FUjSC4dksa1wGg1BRmbTD3xIYq1kfs",
  authDomain: "spt-employee-hub.firebaseapp.com",
  projectId: "spt-employee-hub",
  storageBucket: "spt-employee-hub.firebasestorage.app",
  messagingSenderId: "221082548144",
  appId: "1:221082548144:web:b5addda41ca65f6aba4875",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data,
    tag: payload.data?.type || 'notification',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        const url = event.notification.data?.link || '/dashboard';
        return clients.openWindow(url);
      }
    })
  );
});

