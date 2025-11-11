import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ["http://localhost:5173", "http://localhost:8080"];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list or is a Vercel preview URL
      if (allowedOrigins.some(allowed => origin === allowed) || 
          origin.includes('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Helper functions
const serializePunches = (punches) => JSON.stringify(punches);
const deserializePunches = (punches) => JSON.parse(punches || '[]');
const serializeTotals = (totals) => JSON.stringify(totals);
const deserializeTotals = (totals) => JSON.parse(totals || '{"workMin":0,"breakMin":0}');
const serializeReadBy = (readBy) => JSON.stringify(readBy);
const deserializeReadBy = (readBy) => JSON.parse(readBy || '[]');

// Broadcast to all clients
const broadcast = (event, data) => {
  io.emit(event, data);
};

// ========== USERS ==========
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { name, role, pin, baseSalary } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, name, role, pin, baseSalary) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, role, pin, baseSalary || null);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  broadcast('user:created', user);
  res.json(user);
});

app.put('/api/users/:id', (req, res) => {
  const { name, role, pin, baseSalary } = req.body;
  db.prepare('UPDATE users SET name = ?, role = ?, pin = ?, baseSalary = ? WHERE id = ?')
    .run(name, role, pin, baseSalary || null, req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  broadcast('user:updated', user);
  res.json(user);
});

app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  broadcast('user:deleted', { id: req.params.id });
  res.json({ success: true });
});

// ========== AUTH ==========
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE pin = ?').get(pin);
  if (!user) return res.status(401).json({ error: 'Invalid PIN' });
  res.json(user);
});

// ========== ATTENDANCE ==========
app.get('/api/attendance/today/:userId', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
    .get(req.params.userId, today);
  if (!attendance) return res.json(null);
  res.json({
    ...attendance,
    punches: deserializePunches(attendance.punches),
    totals: deserializeTotals(attendance.totals)
  });
});

app.get('/api/attendance/history/:userId', (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const attendances = db.prepare('SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC LIMIT ?')
    .all(req.params.userId, limit);
  res.json(attendances.map(att => ({
    ...att,
    punches: deserializePunches(att.punches),
    totals: deserializeTotals(att.totals)
  })));
});

app.get('/api/attendance/all', (req, res) => {
  const attendances = db.prepare('SELECT * FROM attendance ORDER BY date DESC').all();
  res.json(attendances.map(att => ({
    ...att,
    punches: deserializePunches(att.punches),
    totals: deserializeTotals(att.totals)
  })));
});

app.post('/api/attendance/punch', (req, res) => {
  const { userId, type } = req.body;
  const today = new Date().toISOString().split('T')[0];
  
  // Get or create attendance
  let attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
    .get(userId, today);
  
  if (!attendance) {
    const id = uuidv4();
    db.prepare('INSERT INTO attendance (id, userId, date, punches, totals) VALUES (?, ?, ?, ?, ?)')
      .run(id, userId, today, serializePunches([]), serializeTotals({ workMin: 0, breakMin: 0 }));
    attendance = db.prepare('SELECT * FROM attendance WHERE userId = ? AND date = ?')
      .get(userId, today);
  }
  
  // Add punch
  const punches = deserializePunches(attendance.punches);
  punches.push({ at: new Date().toISOString(), type });
  
  // Calculate totals
  const totals = calculateTotals(punches);
  
  // Update attendance
  db.prepare('UPDATE attendance SET punches = ?, totals = ? WHERE id = ?')
    .run(serializePunches(punches), serializeTotals(totals), attendance.id);
  
  const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendance.id);
  const result = {
    ...updated,
    punches: deserializePunches(updated.punches),
    totals: deserializeTotals(updated.totals)
  };
  
  broadcast('attendance:updated', result);
  res.json(result);
});

function calculateTotals(punches) {
  let workMin = 0;
  let breakMin = 0;
  let lastIn = null;
  let lastBreakStart = null;
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

// ========== NOTES ==========
app.get('/api/notes', (req, res) => {
  const { status, showAdminOnly, currentUserId } = req.query;
  let query = 'SELECT * FROM notes WHERE 1=1';
  const params = [];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  if (showAdminOnly === 'false' || (currentUserId && !isAdmin(currentUserId))) {
    query += ' AND adminOnly = 0';
  }
  
  query += ' ORDER BY createdAt DESC';
  
  const notes = db.prepare(query).all(...params);
  res.json(notes.map(note => ({
    ...note,
    createdAt: new Date(note.createdAt),
    expiresAt: note.expiresAt ? new Date(note.expiresAt) : null,
    readBy: deserializeReadBy(note.readBy)
  })));
});

app.post('/api/notes', (req, res) => {
  const { text, createdBy, category, adminOnly } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO notes (id, text, createdBy, createdAt, status, category, adminOnly) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, text, createdBy, new Date().toISOString(), 'pending', category || 'general', adminOnly ? 1 : 0);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  broadcast('note:created', note);
  res.json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const updates = req.body;
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  db.prepare(`UPDATE notes SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  broadcast('note:updated', note);
  res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  broadcast('note:deleted', { id: req.params.id });
  res.json({ success: true });
});

// ========== LEAVES ==========
app.get('/api/leaves', (req, res) => {
  const { userId } = req.query;
  let query = 'SELECT * FROM leaves';
  const params = [];
  if (userId) {
    query += ' WHERE userId = ?';
    params.push(userId);
  }
  query += ' ORDER BY date DESC';
  const leaves = db.prepare(query).all(...params);
  res.json(leaves);
});

app.post('/api/leaves', (req, res) => {
  const { userId, date, type, reason } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO leaves (id, userId, date, type, reason, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, date, type, reason, 'pending');
  const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
  broadcast('leave:created', leave);
  res.json(leave);
});

app.put('/api/leaves/:id', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, req.params.id);
  const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(req.params.id);
  broadcast('leave:updated', leave);
  res.json(leave);
});

// ========== SALARIES ==========
app.get('/api/salaries', (req, res) => {
  const { userId, month } = req.query;
  let query = 'SELECT * FROM salaries WHERE 1=1';
  const params = [];
  if (userId) {
    query += ' AND userId = ?';
    params.push(userId);
  }
  if (month) {
    query += ' AND month = ?';
    params.push(month);
  }
  const salaries = db.prepare(query).all(...params);
  res.json(salaries);
});

app.post('/api/salaries', (req, res) => {
  const salary = req.body;
  const id = salary.id || uuidv4();
  db.prepare('INSERT OR REPLACE INTO salaries (id, userId, month, type, base, hours, calcPay, adjustments, finalPay, paid, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, salary.userId, salary.month, salary.type, salary.base, salary.hours, salary.calcPay, salary.adjustments, salary.finalPay, salary.paid ? 1 : 0, salary.note || null);
  const result = db.prepare('SELECT * FROM salaries WHERE id = ?').get(id);
  broadcast('salary:updated', result);
  res.json(result);
});

app.delete('/api/salaries/:id', (req, res) => {
  db.prepare('DELETE FROM salaries WHERE id = ?').run(req.params.id);
  broadcast('salary:deleted', { id: req.params.id });
  res.json({ success: true });
});

// ========== ANNOUNCEMENTS ==========
app.get('/api/announcements', (req, res) => {
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
  res.json(announcements.map(ann => ({
    ...ann,
    createdAt: new Date(ann.createdAt),
    expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : null,
    readBy: deserializeReadBy(ann.readBy)
  })));
});

app.post('/api/announcements', (req, res) => {
  const { title, body, expiresAt } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO announcements (id, title, body, createdAt, expiresAt, readBy) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, title, body, new Date().toISOString(), expiresAt || null, serializeReadBy([]));
  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  broadcast('announcement:created', announcement);
  res.json(announcement);
});

app.put('/api/announcements/:id/read', (req, res) => {
  const { userId } = req.body;
  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Not found' });
  const readBy = deserializeReadBy(announcement.readBy);
  if (!readBy.includes(userId)) {
    readBy.push(userId);
    db.prepare('UPDATE announcements SET readBy = ? WHERE id = ?')
      .run(serializeReadBy(readBy), req.params.id);
  }
  broadcast('announcement:updated', { ...announcement, readBy });
  res.json({ success: true });
});

function isAdmin(userId) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  return user?.role === 'admin';
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`WebSocket server ready for real-time updates`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

