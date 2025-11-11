import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../../api/db.js';

const deserializeReadBy = (readBy: string) => JSON.parse(readBy || '[]');
const serializeReadBy = (readBy: string[]) => JSON.stringify(readBy);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'PUT') {
      const { userId } = req.body;
      const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.query.id) as any;
      if (!announcement) return res.status(404).json({ error: 'Not found' });
      const readBy = deserializeReadBy(announcement.readBy);
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        db.prepare('UPDATE announcements SET readBy = ? WHERE id = ?')
          .run(serializeReadBy(readBy), req.query.id);
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

