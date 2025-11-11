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
      const { userId, month } = req.query;
      let query = 'SELECT * FROM salaries WHERE 1=1';
      const params: any[] = [];
      if (userId) {
        query += ' AND userId = ?';
        params.push(userId);
      }
      if (month) {
        query += ' AND month = ?';
        params.push(month);
      }
      const salaries = db.prepare(query).all(...params);
      return res.json(salaries);
    }

    if (req.method === 'POST') {
      const salary = req.body;
      const id = salary.id || uuidv4();
      db.prepare('INSERT OR REPLACE INTO salaries (id, userId, month, type, base, hours, calcPay, adjustments, finalPay, paid, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, salary.userId, salary.month, salary.type, salary.base, salary.hours, salary.calcPay, salary.adjustments, salary.finalPay, salary.paid ? 1 : 0, salary.note || null);
      const result = db.prepare('SELECT * FROM salaries WHERE id = ?').get(id);
      return res.json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

