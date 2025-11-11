import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../api/db.js';
import { v4 as uuidv4 } from 'uuid';

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
      const { userId } = req.query;
      let query = 'SELECT * FROM leaves';
      const params: any[] = [];
      if (userId) {
        query += ' WHERE userId = ?';
        params.push(userId);
      }
      query += ' ORDER BY date DESC';
      const leaves = db.prepare(query).all(...params);
      return res.json(leaves);
    }

    if (req.method === 'POST') {
      const { userId, date, type, reason } = req.body;
      const id = uuidv4();
      db.prepare('INSERT INTO leaves (id, userId, date, type, reason, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, userId, date, type, reason, 'pending');
      const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
      return res.json(leave);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

