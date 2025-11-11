import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../../api/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 30;
    const attendances = db.prepare('SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC LIMIT ?')
      .all(userId, limit) as any[];
    
    return res.json(attendances.map(att => ({
      ...att,
      punches: JSON.parse(att.punches),
      totals: JSON.parse(att.totals)
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

