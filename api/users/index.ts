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
      const users = db.prepare('SELECT * FROM users').all();
      return res.json(users);
    }

    if (req.method === 'POST') {
      const { name, role, pin, baseSalary } = req.body;
      const id = uuidv4();
      db.prepare('INSERT INTO users (id, name, role, pin, baseSalary) VALUES (?, ?, ?, ?, ?)')
        .run(id, name, role, pin, baseSalary || null);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      return res.json(user);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

