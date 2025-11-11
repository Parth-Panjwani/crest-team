import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../api/db.js';
import { v4 as uuidv4 } from 'uuid';

function calculateTotals(punches: any[]) {
  let workMin = 0;
  let breakMin = 0;
  let lastIn: number | null = null;
  let lastBreakStart: number | null = null;
  const now = Date.now();

  for (const punch of punches) {
    const punchTime = new Date(punch.at).getTime();
    if (punch.type === 'IN') {
      lastIn = punchTime;
    } else if (punch.type === 'OUT' && lastIn) {
      workMin += (punchTime - lastIn) / 60000;
      lastIn = null;
    } else if (punch.type === 'BREAK_START' && lastIn) {
      workMin += (punchTime - lastIn) / 60000;
      lastBreakStart = punchTime;
      lastIn = null;
    } else if (punch.type === 'BREAK_END' && lastBreakStart) {
      breakMin += (punchTime - lastBreakStart) / 60000;
      lastIn = punchTime;
      lastBreakStart = null;
    }
  }

  if (lastIn) {
    workMin += (now - lastIn) / 60000;
  }

  return {
    workMin: Math.round(workMin),
    breakMin: Math.round(breakMin)
  };
}

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
    const { userId, type } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create attendance
    let attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
      .get(userId, today) as any;
    
    if (!attendance) {
      const id = uuidv4();
      db.prepare('INSERT INTO attendance (id, userId, date, punches, totals) VALUES (?, ?, ?, ?, ?)')
        .run(id, userId, today, JSON.stringify([]), JSON.stringify({ workMin: 0, breakMin: 0 }));
      attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
        .get(userId, today) as any;
    }
    
    // Add punch
    const punches = JSON.parse(attendance.punches || '[]');
    punches.push({ at: new Date().toISOString(), type });
    
    // Calculate totals
    const totals = calculateTotals(punches);
    
    // Update attendance
    db.prepare('UPDATE attendance SET punches = ?, totals = ? WHERE id = ?')
      .run(JSON.stringify(punches), JSON.stringify(totals), attendance.id);
    
    const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendance.id) as any;
    const result = {
      ...updated,
      punches: JSON.parse(updated.punches),
      totals: JSON.parse(updated.totals)
    };
    
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

