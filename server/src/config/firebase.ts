import admin from 'firebase-admin';

let firebaseAdmin: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): void {
  if (firebaseAdmin) {
    return; // Already initialized
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.warn('⚠️  Firebase credentials not configured. Push notifications will be disabled.');
    return;
  }

  try {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  }
}

/**
 * Send push notification to a user
 * @param userId User ID to send notification to
 * @param title Notification title
 * @param body Notification body
 * @param data Optional data payload
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!firebaseAdmin) {
    console.warn('Firebase not initialized, skipping push notification');
    return;
  }

  try {
    // Get user's FCM token from database
    const { getCollection } = await import('../models/index.js');
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ id: userId });

    if (!user || !user.fcmToken) {
      // This is expected - user may not have granted notification permissions
      // Only log in development mode to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️  No FCM token found for user ${userId} - push notifications disabled for this user`);
      }
      return;
    }

    const message: admin.messaging.Message = {
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
      webpush: {
        notification: {
          title,
          body,
          icon: '/logo.png',
          badge: '/logo.png',
        },
        fcmOptions: {
          link: '/dashboard', // Default link when notification is clicked
        },
      },
    };

    await firebaseAdmin.messaging().send(message);
    console.log(`✅ Push notification sent to user ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to send push notification to user ${userId}:`, error);
    // Don't throw - we don't want to break the main flow if push notification fails
  }
}

