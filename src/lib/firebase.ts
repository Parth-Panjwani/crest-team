import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase client SDK
 */
export function initializeFirebaseClient(): FirebaseApp | null {
  if (app) {
    return app;
  }

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Check if all required config values are present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    if (import.meta.env.DEV) {
      console.warn('⚠️  Firebase config not complete. Missing:', {
        apiKey: !firebaseConfig.apiKey,
        projectId: !firebaseConfig.projectId,
      });
    }
    return null;
  }

  // Check VAPID key
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey && import.meta.env.DEV) {
    console.warn('⚠️  VITE_FIREBASE_VAPID_KEY is not set. FCM tokens cannot be generated.');
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
    console.log('✅ Firebase client initialized');
    return app;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase client:', error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
export function getFirebaseMessaging(): Messaging | null {
  if (!app) {
    app = initializeFirebaseClient();
    if (!app) return null;
  }

  if (messaging) {
    return messaging;
  }

  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('❌ Failed to get Firebase Messaging:', error);
    return null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Get FCM token
 */
export async function getFCMToken(): Promise<string | null> {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    // Register service worker first (if not already registered)
    if ('serviceWorker' in navigator) {
      try {
        // Check if service worker is already registered
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        let registration = existingRegistrations.find(reg => 
          reg.active?.scriptURL.includes('firebase-messaging-sw.js')
        );
        
        if (!registration) {
          console.log('📝 Registering new service worker...');
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
          console.log('✅ Service Worker registered:', registration.scope);
          
          // Wait for service worker to be active
          if (registration.installing) {
            console.log('⏳ Waiting for service worker to install...');
            await new Promise((resolve) => {
              registration!.installing!.addEventListener('statechange', function() {
                if (this.state === 'activated') {
                  console.log('✅ Service worker activated');
                  resolve(undefined);
                }
              });
            });
          } else if (registration.waiting) {
            console.log('⏳ Service worker waiting, activating...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        } else {
          console.log('✅ Service Worker already registered');
          console.log('📋 Service Worker state:', registration.active?.state || 'no active worker');
        }
      } catch (swError) {
        console.error('❌ Service Worker registration failed:', swError);
        throw swError; // Don't continue if service worker registration fails
      }
    } else {
      throw new Error('Service workers are not supported in this browser');
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('⚠️  VITE_FIREBASE_VAPID_KEY is not set. FCM tokens cannot be generated.');
      return null;
    }

    console.log('📋 VAPID key found, requesting token from Firebase...');
    
    // Wait for service worker to be ready with a timeout
    let serviceWorkerRegistration: ServiceWorkerRegistration;
    try {
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Service worker ready timeout')), 5000);
      });
      serviceWorkerRegistration = await Promise.race([readyPromise, timeoutPromise]);
      console.log('✅ Service worker ready, scope:', serviceWorkerRegistration.scope);
    } catch (swError) {
      console.error('❌ Service worker not ready:', swError);
      throw new Error('Service worker not ready');
    }
    
    // Check if service worker is active
    if (!serviceWorkerRegistration.active) {
      console.error('❌ Service worker is not active');
      throw new Error('Service worker is not active');
    }
    console.log('✅ Service worker is active, requesting FCM token...');
    
    try {
      // Add a timeout wrapper for getToken
      const tokenPromise = getToken(messagingInstance, {
        vapidKey,
        serviceWorkerRegistration,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('getToken timeout after 8 seconds')), 8000);
      });
      
      const token = await Promise.race([tokenPromise, timeoutPromise]);

      if (token) {
        console.log('✅ FCM token obtained successfully');
        return token;
      } else {
        // This is expected if user hasn't granted permissions or VAPID key is missing
        console.warn('⚠️  getToken returned null - no token available');
        return null;
      }
    } catch (tokenError) {
      const errorMessage = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.error('❌ Error calling getToken:', errorMessage);
      
      // Check for specific Firebase errors
      if (errorMessage.includes('messaging/invalid-vapid-key')) {
        console.error('❌ Invalid VAPID key - check VITE_FIREBASE_VAPID_KEY in .env file');
      } else if (errorMessage.includes('messaging/registration-token-not-registered')) {
        console.error('❌ Service worker registration issue');
      } else if (errorMessage.includes('timeout')) {
        console.error('❌ Request timed out - Firebase may be unreachable or service worker has issues');
      }
      
      throw tokenError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to get FCM token:', errorMessage);
    
    // Provide helpful error messages
    if (errorMessage.includes('messaging/registration-token-not-registered')) {
      console.warn('ℹ️  Service worker may not be properly registered');
    } else if (errorMessage.includes('messaging/invalid-vapid-key')) {
      console.warn('ℹ️  Invalid VAPID key - check VITE_FIREBASE_VAPID_KEY environment variable');
    } else if (errorMessage.includes('messaging/permission-blocked')) {
      console.warn('ℹ️  Notification permission is blocked - user needs to enable in browser settings');
    }
    
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    return onMessage(messagingInstance, callback);
  } catch (error) {
    console.error('❌ Failed to set up foreground message listener:', error);
    return null;
  }
}

