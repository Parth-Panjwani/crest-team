import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const deserializeReadBy = (readBy: string) => JSON.parse(readBy || '[]');
const serializeReadBy = (readBy: string[]) => JSON.stringify(readBy);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all() as any[];
      return res.json(announcements.map(ann => ({
        ...ann,
        createdAt: new Date(ann.createdAt),
        expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : null,
        readBy: deserializeReadBy(ann.readBy)
      })));
    }

    if (req.method === 'POST') {
      const { title, body, expiresAt } = req.body;
      const id = uuidv4();
      db.prepare('INSERT INTO announcements (id, title, body, createdAt, expiresAt, readBy) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, title, body, new Date().toISOString(), expiresAt || null, serializeReadBy([]));
      const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
      return res.json({
        ...announcement,
        createdAt: new Date(announcement.createdAt),
        expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : null,
        readBy: deserializeReadBy(announcement.readBy)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

