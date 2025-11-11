import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pin } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE pin = ?').get(pin) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

