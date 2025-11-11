import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../db.js';

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
    const today = new Date().toISOString().split('T')[0];
    const attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
      .get(userId, today) as any;
    
    if (!attendance) {
      return res.json(null);
    }
    
    return res.json({
      ...attendance,
      punches: JSON.parse(attendance.punches),
      totals: JSON.parse(attendance.totals)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

