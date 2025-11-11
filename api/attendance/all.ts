import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../db.js';

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
    const attendances = db.prepare('SELECT * FROM attendance ORDER BY date DESC').all() as any[];
    return res.json(attendances.map(att => ({
      ...att,
      punches: JSON.parse(att.punches),
      totals: JSON.parse(att.totals)
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

