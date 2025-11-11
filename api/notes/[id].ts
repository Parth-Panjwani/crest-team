import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../api/db.js';

const deserializeReadBy = (readBy: string) => JSON.parse(readBy || '[]');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const id = req.query.id as string;

    if (req.method === 'PUT') {
      const updates = req.body;
      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      db.prepare(`UPDATE notes SET ${setClause} WHERE id = ?`).run(...values, id);
      const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
      return res.json({
        ...note,
        createdAt: new Date(note.createdAt),
        expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
        readBy: deserializeReadBy(note.readBy),
        adminOnly: Boolean(note.adminOnly)
      });
    }

    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM notes WHERE id = ?').run(id);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

