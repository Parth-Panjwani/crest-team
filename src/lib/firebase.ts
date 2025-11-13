import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Safely check if Notification API is available
 */
function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && typeof window.Notification !== 'undefined';
}

/**
 * Safely get Notification API
 */
function getNotificationAPI(): typeof Notification | null {
  if (!isNotificationSupported()) {
    return null;
  }
  return window.Notification;
}

/**
 * Initialize Firebase client SDK
 */
export function initializeFirebaseClient(): FirebaseApp | null {
  if (app) {
    return app;
  }

  // Safely get environment variables with fallback to empty string
  const getEnvVar = (key: string): string | undefined => {
    try {
      // Direct access - Vite replaces these at build time
      const value = import.meta.env[key];
      const hasValue = value && typeof value === 'string' && value.trim() !== '';
      
      // Debug logging (only in production to help diagnose mobile issues)
      if (!hasValue && typeof window !== 'undefined') {
        console.debug(`[Firebase] ${key}:`, value === undefined ? 'undefined' : value === '' ? 'empty string' : typeof value);
      }
      
      return hasValue ? value : undefined;
    } catch (error) {
      // Environment variable not available (e.g., in production build without env vars)
      console.error(`[Firebase] Error accessing ${key}:`, error);
      return undefined;
    }
  };

  // Debug: Log all VITE_ env vars (for troubleshooting)
  if (typeof window !== 'undefined' && import.meta.env.DEV === false) {
    const allViteVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
    console.debug('[Firebase] Available VITE_ variables:', allViteVars);
    console.debug('[Firebase] import.meta.env keys:', Object.keys(import.meta.env));
  }

  const firebaseConfig = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  };

  // Check if all required config values are present
  const missingVars: string[] = [];
  if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.appId) missingVars.push('VITE_FIREBASE_APP_ID');

  if (missingVars.length > 0) {
    // Always log in production so users know what's missing
    console.error('❌ Firebase config not complete. Missing environment variables:', missingVars.join(', '));
    console.error('💡 This usually means:');
    console.error('   1. Variables not set in Vercel (Settings → Environment Variables)');
    console.error('   2. Build was done before variables were added (need to redeploy)');
    console.error('   3. Mobile browser is using cached build (clear cache/hard refresh)');
    console.error('   📱 Mobile fix: Clear browser cache or do a hard refresh (hold refresh button)');
    return null;
  }

  // Check VAPID key (optional but recommended)
  const vapidKey = getEnvVar('VITE_FIREBASE_VAPID_KEY');
  if (!vapidKey) {
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
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
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
  const NotificationAPI = getNotificationAPI();
  if (!NotificationAPI) {
    console.warn('⚠️  Notification API is not available in this browser/context');
    return false;
  }

  if (NotificationAPI.permission === 'granted') {
    return true;
  }

  if (NotificationAPI.permission === 'denied') {
    console.warn('⚠️  Notification permission denied');
    return false;
  }

  try {
    const permission = await NotificationAPI.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): 'default' | 'granted' | 'denied' {
  const NotificationAPI = getNotificationAPI();
  if (!NotificationAPI) {
    return 'default';
  }
  return NotificationAPI.permission;
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

