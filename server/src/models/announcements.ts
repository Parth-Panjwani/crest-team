import { ObjectId } from 'mongodb';

export interface AnnouncementDocument {
  _id?: ObjectId;
  id: string;
  title: string;
  body?: string;
  message?: string;
  createdAt: string;
  expiresAt?: string | null;
  readBy?: string[];
}

export interface AnnouncementResponse {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  expiresAt: string | null;
  readBy: string[];
}

export function formatAnnouncement(doc: AnnouncementDocument): AnnouncementResponse {
  return {
    id: doc.id,
    title: doc.title,
    body: doc.body || doc.message || '',
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt || null,
    readBy: doc.readBy || [],
  };
}

