import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../api/db.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const id = req.query.id as string;

    if (req.method === 'GET') {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(user);
    }

    if (req.method === 'PUT') {
      const { name, role, pin, baseSalary } = req.body;
      db.prepare('UPDATE users SET name = ?, role = ?, pin = ?, baseSalary = ? WHERE id = ?')
        .run(name, role, pin, baseSalary || null, id);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      return res.json(user);
    }

    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

