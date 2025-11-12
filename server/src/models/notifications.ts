import { ObjectId } from 'mongodb';

export interface NotificationDocument {
  _id?: ObjectId;
  id: string;
  type: 'punch' | 'leave' | 'note' | 'salary' | 'announcement';
  title: string;
  message: string;
  userId?: string; // User who triggered the notification
  targetUserId?: string; // User who should receive the notification (admin)
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  userId?: string;
  targetUserId?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export function formatNotification(doc: NotificationDocument): NotificationResponse {
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    userId: doc.userId,
    targetUserId: doc.targetUserId,
    read: doc.read,
    createdAt: doc.createdAt,
    data: doc.data,
  };
}

