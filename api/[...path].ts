import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

// Helper functions
const deserializePunches = (punches: string) => JSON.parse(punches || '[]');
const serializePunches = (punches: any[]) => JSON.stringify(punches);
const deserializeTotals = (totals: string) => JSON.parse(totals || '{"workMin":0,"breakMin":0}');
const serializeTotals = (totals: any) => JSON.stringify(totals);
const deserializeReadBy = (readBy: string) => JSON.parse(readBy || '[]');
const serializeReadBy = (readBy: string[]) => JSON.stringify(readBy);

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

async function isAdmin(userId: string): Promise<boolean> {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
  return user?.role === 'admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract path segments from query (Vercel passes dynamic route params in req.query)
  const pathParam = req.query.path as string | string[] | undefined;
  const pathArray = Array.isArray(pathParam) ? pathParam : (pathParam ? [pathParam] : []);
  const segments = pathArray.filter(Boolean);

  try {
    // Auth routes
    if (segments[0] === 'auth' && segments[1] === 'login') {
      if (req.method === 'POST') {
        const { pin } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE pin = ?').get(pin) as any;
        if (!user) {
          return res.status(401).json({ error: 'Invalid PIN' });
        }
        return res.json(user);
      }
    }

    // Users routes
    if (segments[0] === 'users') {
      if (segments[1]) {
        const id = segments[1];
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
      } else {
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
      }
    }

    // Attendance routes
    if (segments[0] === 'attendance') {
      if (segments[1] === 'punch' && req.method === 'POST') {
        const { userId, type } = req.body;
        const today = new Date().toISOString().split('T')[0];
        
        let attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
          .get(userId, today) as any;
        
        if (!attendance) {
          const id = uuidv4();
          db.prepare('INSERT INTO attendance (id, userId, date, punches, totals) VALUES (?, ?, ?, ?, ?)')
            .run(id, userId, today, serializePunches([]), serializeTotals({ workMin: 0, breakMin: 0 }));
          attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
            .get(userId, today) as any;
        }
        
        const punches = deserializePunches(attendance.punches);
        punches.push({ at: new Date().toISOString(), type });
        const totals = calculateTotals(punches);
        
        db.prepare('UPDATE attendance SET punches = ?, totals = ? WHERE id = ?')
          .run(serializePunches(punches), serializeTotals(totals), attendance.id);
        
        const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendance.id) as any;
        return res.json({
          ...updated,
          punches: deserializePunches(updated.punches),
          totals: deserializeTotals(updated.totals)
        });
      }

      if (segments[1] === 'today' && segments[2]) {
        const userId = segments[2];
        const today = new Date().toISOString().split('T')[0];
        const attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
          .get(userId, today) as any;
        
        if (!attendance) {
          return res.json(null);
        }
        
        return res.json({
          ...attendance,
          punches: deserializePunches(attendance.punches),
          totals: deserializeTotals(attendance.totals)
        });
      }

      if (segments[1] === 'history' && segments[2]) {
        const userId = segments[2];
        const limit = parseInt(req.query.limit as string) || 30;
        const attendances = db.prepare('SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC LIMIT ?')
          .all(userId, limit) as any[];
        
        return res.json(attendances.map(att => ({
          ...att,
          punches: deserializePunches(att.punches),
          totals: deserializeTotals(att.totals)
        })));
      }

      if (segments[1] === 'all' && req.method === 'GET') {
        const attendances = db.prepare('SELECT * FROM attendance ORDER BY date DESC').all() as any[];
        return res.json(attendances.map(att => ({
          ...att,
          punches: deserializePunches(att.punches),
          totals: deserializeTotals(att.totals)
        })));
      }
    }

    // Notes routes
    if (segments[0] === 'notes') {
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'PUT') {
          const updates = req.body;
          const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
          const values = Object.values(updates);
          db.prepare(`UPDATE notes SET ${setClause} WHERE id = ?`).run(...values, id);
          const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
          return res.json({
            ...note,
            createdAt: new Date(note.createdAt),
            expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
            readBy: deserializeReadBy(note.readBy),
            adminOnly: Boolean(note.adminOnly)
          });
        }
        if (req.method === 'DELETE') {
          db.prepare('DELETE FROM notes WHERE id = ?').run(id);
          return res.json({ success: true });
        }
      } else {
        if (req.method === 'GET') {
          const { status, showAdminOnly, currentUserId } = req.query;
          let query = 'SELECT * FROM notes WHERE 1=1';
          const params: any[] = [];
          
          if (status) {
            query += ' AND status = ?';
            params.push(status);
          }
          
          if (showAdminOnly === 'false' || (currentUserId && !await isAdmin(currentUserId as string))) {
            query += ' AND adminOnly = 0';
          }
          
          query += ' ORDER BY createdAt DESC';
          
          const notes = db.prepare(query).all(...params) as any[];
          return res.json(notes.map(note => ({
            ...note,
            createdAt: new Date(note.createdAt),
            expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
            readBy: deserializeReadBy(note.readBy),
            adminOnly: Boolean(note.adminOnly)
          })));
        }
        if (req.method === 'POST') {
          const { text, createdBy, category, adminOnly } = req.body;
          const id = uuidv4();
          db.prepare('INSERT INTO notes (id, text, createdBy, createdAt, status, category, adminOnly) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(id, text, createdBy, new Date().toISOString(), 'pending', category || 'general', adminOnly ? 1 : 0);
          const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
          return res.json({
            ...note,
            createdAt: new Date(note.createdAt),
            expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
            readBy: deserializeReadBy(note.readBy),
            adminOnly: Boolean(note.adminOnly)
          });
        }
      }
    }

    // Leaves routes
    if (segments[0] === 'leaves') {
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'PUT') {
          const { status } = req.body;
          db.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, id);
          const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
          return res.json(leave);
        }
      } else {
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
      }
    }

    // Salaries routes
    if (segments[0] === 'salaries') {
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'DELETE') {
          db.prepare('DELETE FROM salaries WHERE id = ?').run(id);
          return res.json({ success: true });
        }
      } else {
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
      }
    }

    // Announcements routes
    if (segments[0] === 'announcements') {
      if (segments[1] && segments[2] === 'read' && req.method === 'PUT') {
        const id = segments[1];
        const { userId } = req.body;
        const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
        if (!announcement) return res.status(404).json({ error: 'Not found' });
        const readBy = deserializeReadBy(announcement.readBy);
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          db.prepare('UPDATE announcements SET readBy = ? WHERE id = ?')
            .run(serializeReadBy(readBy), id);
        }
        return res.json({ success: true });
      } else if (!segments[1]) {
        if (req.method === 'GET') {
          const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all() as any[];
          return res.json(announcements.map(ann => ({
            ...ann,
            createdAt: new Date(ann.createdAt),
            expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : null,
            readBy: deserializeReadBy(ann.readBy)
          })));
        }
        if (req.method === 'POST') {
          const { title, body, expiresAt } = req.body;
          const id = uuidv4();
          db.prepare('INSERT INTO announcements (id, title, body, createdAt, expiresAt, readBy) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, title, body, new Date().toISOString(), expiresAt || null, serializeReadBy([]));
          const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
          return res.json({
            ...announcement,
            createdAt: new Date(announcement.createdAt),
            expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : null,
            readBy: deserializeReadBy(announcement.readBy)
          });
        }
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

