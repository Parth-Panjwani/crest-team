import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const deserializeReadBy = (readBy: string) => JSON.parse(readBy || '[]');
const serializeReadBy = (readBy: string[]) => JSON.stringify(readBy);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { status, showAdminOnly, currentUserId } = req.query;
      let query = 'SELECT * FROM notes WHERE 1=1';
      const params: any[] = [];
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      if (showAdminOnly === 'false' || (currentUserId && !await isAdmin(currentUserId as string))) {
        query += ' AND adminOnly = 0';
      }
      
      query += ' ORDER BY createdAt DESC';
      
      const notes = db.prepare(query).all(...params) as any[];
      return res.json(notes.map(note => ({
        ...note,
        createdAt: new Date(note.createdAt),
        expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
        readBy: deserializeReadBy(note.readBy),
        adminOnly: Boolean(note.adminOnly)
      })));
    }

    if (req.method === 'POST') {
      const { text, createdBy, category, adminOnly } = req.body;
      const id = uuidv4();
      db.prepare('INSERT INTO notes (id, text, createdBy, createdAt, status, category, adminOnly) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, text, createdBy, new Date().toISOString(), 'pending', category || 'general', adminOnly ? 1 : 0);
      const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
      return res.json({
        ...note,
        createdAt: new Date(note.createdAt),
        expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
        readBy: deserializeReadBy(note.readBy),
        adminOnly: Boolean(note.adminOnly)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function isAdmin(userId: string): Promise<boolean> {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
  return user?.role === 'admin';
}

