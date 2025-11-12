import { sendPushNotification } from '../config/firebase.js';
import { getCollection } from '../models/index.js';
import type { NotificationDocument } from '../models/notifications.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Send push notification to a user and create in-app notification
 * @param userId User ID to send notification to
 * @param title Notification title
 * @param body Notification body
 * @param data Optional data payload for push notification
 * @param notificationType Type of notification (for in-app notification)
 */
export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  notificationType: 'punch' | 'leave' | 'note' | 'salary' | 'announcement' | 'chat' = 'note'
): Promise<void> {
  try {
    // Send Firebase push notification
    await sendPushNotification(userId, title, body, data);

    // Create in-app notification in database
    const notificationsCollection = await getCollection<NotificationDocument>('notifications');
    const notification: NotificationDocument = {
      id: uuidv4(),
      type: notificationType,
      title,
      message: body,
      targetUserId: userId,
      read: false,
      createdAt: new Date().toISOString(),
      data: data || {},
    };

    await notificationsCollection.insertOne(notification);
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Don't throw - notification failure shouldn't break main flow
  }
}

