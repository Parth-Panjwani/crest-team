import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../db.js';

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
      const { status } = req.body;
      db.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, req.query.id);
      const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(req.query.id);
      return res.json(leave);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

