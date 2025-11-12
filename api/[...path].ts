import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, getCollection, formatUser, formatAttendance, formatNote, formatLeave, formatSalary } from './mongodb.js';
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

async function isAdmin(userId: string): Promise<boolean> {
  const usersCollection = await getCollection('users');
  const user = await usersCollection.findOne({ id: userId });
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
    // Connect to MongoDB
    await connectToDatabase();

    // Auth routes
    if (segments[0] === 'auth' && segments[1] === 'login') {
      if (req.method === 'POST') {
        const { pin } = req.body;
        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne({ pin });
        if (!user) {
          return res.status(401).json({ error: 'Invalid PIN' });
        }
        return res.json(formatUser(user));
      }
    }

    // Users routes
    if (segments[0] === 'users') {
      const usersCollection = await getCollection('users');
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'GET') {
          const user = await usersCollection.findOne({ id });
          if (!user) return res.status(404).json({ error: 'User not found' });
          return res.json(formatUser(user));
        }
        if (req.method === 'PUT') {
          const { name, role, pin, baseSalary } = req.body;
          await usersCollection.updateOne(
            { id },
            { $set: { name, role, pin, baseSalary: baseSalary || null } }
          );
          const user = await usersCollection.findOne({ id });
          return res.json(formatUser(user));
        }
        if (req.method === 'DELETE') {
          await usersCollection.deleteOne({ id });
          // Also delete related data
          const attendanceCollection = await getCollection('attendance');
          await attendanceCollection.deleteMany({ userId: id });
          const notesCollection = await getCollection('notes');
          await notesCollection.deleteMany({ createdBy: id });
          const leavesCollection = await getCollection('leaves');
          await leavesCollection.deleteMany({ userId: id });
          const salariesCollection = await getCollection('salaries');
          await salariesCollection.deleteMany({ userId: id });
          return res.json({ success: true });
        }
      } else {
        if (req.method === 'GET') {
          const users = await usersCollection.find({}).toArray();
          return res.json(users.map(formatUser));
        }
        if (req.method === 'POST') {
          const { name, role, pin, baseSalary } = req.body;
          const id = uuidv4();
          const user = { id, name, role, pin, baseSalary: baseSalary || null };
          await usersCollection.insertOne(user);
          return res.json(formatUser(user));
        }
      }
    }

    // Attendance routes
    if (segments[0] === 'attendance') {
      const attendanceCollection = await getCollection('attendance');
      if (segments[1] === 'punch' && req.method === 'POST') {
        const { userId, type } = req.body;
        const today = new Date().toISOString().split('T')[0];
        
        let attendance = await attendanceCollection.findOne({ userId, date: today });
        
        if (!attendance) {
          const id = uuidv4();
          attendance = {
            id,
            userId,
            date: today,
            punches: [],
            totals: { workMin: 0, breakMin: 0 }
          };
          await attendanceCollection.insertOne(attendance);
        }
        
        const punches = attendance.punches || [];
        punches.push({ at: new Date().toISOString(), type });
        const totals = calculateTotals(punches);
        
        await attendanceCollection.updateOne(
          { id: attendance.id },
          { $set: { punches, totals } }
        );
        
        const updated = await attendanceCollection.findOne({ id: attendance.id });
        return res.json(formatAttendance(updated));
      }

      if (segments[1] === 'today' && segments[2]) {
        const userId = segments[2];
        const today = new Date().toISOString().split('T')[0];
        const attendance = await attendanceCollection.findOne({ userId, date: today });
        
        if (!attendance) {
          return res.json(null);
        }
        
        return res.json(formatAttendance(attendance));
      }

      if (segments[1] === 'history' && segments[2]) {
        const userId = segments[2];
        const limit = parseInt(req.query.limit as string) || 30;
        const attendances = await attendanceCollection
          .find({ userId })
          .sort({ date: -1 })
          .limit(limit)
          .toArray();
        
        return res.json(attendances.map(formatAttendance));
      }

      if (segments[1] === 'all' && req.method === 'GET') {
        const attendances = await attendanceCollection
          .find({})
          .sort({ date: -1 })
          .toArray();
        return res.json(attendances.map(formatAttendance));
      }
    }

    // Notes routes
    if (segments[0] === 'notes') {
      const notesCollection = await getCollection('notes');
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'PUT') {
          const updates = req.body;
          // Handle date fields
          if (updates.completedAt) updates.completedAt = new Date(updates.completedAt);
          if (updates.deletedAt) updates.deletedAt = new Date(updates.deletedAt);
          await notesCollection.updateOne(
            { id },
            { $set: updates }
          );
          const note = await notesCollection.findOne({ id });
          return res.json(formatNote(note));
        }
        if (req.method === 'DELETE') {
          // Soft delete
          await notesCollection.updateOne(
            { id },
            { $set: { deleted: true, deletedAt: new Date().toISOString(), deletedBy: req.body.deletedBy } }
          );
          return res.json({ success: true });
        }
        if (req.method === 'POST' && segments[2] === 'restore') {
          await notesCollection.updateOne(
            { id },
            { $set: { deleted: false, deletedAt: null, deletedBy: null } }
          );
          return res.json({ success: true });
        }
        if (req.method === 'DELETE' && segments[2] === 'permanent') {
          await notesCollection.deleteOne({ id });
          return res.json({ success: true });
        }
      } else {
        if (req.method === 'GET') {
          const { status, showAdminOnly, currentUserId, deleted } = req.query;
          const query: any = {};
          
          if (status) {
            query.status = status;
          }
          
          if (deleted === 'true') {
            query.deleted = true;
          } else {
            query.deleted = { $ne: true };
          }
          
          if (showAdminOnly === 'false' || (currentUserId && !await isAdmin(currentUserId as string))) {
            query.adminOnly = false;
          }
          
          const notes = await notesCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
          return res.json(notes.map(formatNote));
        }
        if (req.method === 'POST') {
          const { text, createdBy, category, adminOnly } = req.body;
          const id = uuidv4();
          const note = {
            id,
            text,
            createdBy,
            createdAt: new Date().toISOString(),
            status: 'pending',
            category: category || 'general',
            adminOnly: adminOnly || false,
            deleted: false
          };
          await notesCollection.insertOne(note);
          return res.json(formatNote(note));
        }
      }
    }

    // Leaves routes
    if (segments[0] === 'leaves') {
      const leavesCollection = await getCollection('leaves');
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'PUT') {
          const { status } = req.body;
          await leavesCollection.updateOne(
            { id },
            { $set: { status } }
          );
          const leave = await leavesCollection.findOne({ id });
          return res.json(formatLeave(leave));
        }
      } else {
        if (req.method === 'GET') {
          const { userId } = req.query;
          const query: any = {};
          if (userId) {
            query.userId = userId;
          }
          const leaves = await leavesCollection
            .find(query)
            .sort({ date: -1 })
            .toArray();
          return res.json(leaves.map(formatLeave));
        }
        if (req.method === 'POST') {
          const { userId, date, type, reason } = req.body;
          const id = uuidv4();
          const leave = {
            id,
            userId,
            date,
            type,
            reason,
            status: 'pending'
          };
          await leavesCollection.insertOne(leave);
          return res.json(formatLeave(leave));
        }
      }
    }

    // Salaries routes
    if (segments[0] === 'salaries') {
      const salariesCollection = await getCollection('salaries');
      if (segments[1]) {
        const id = segments[1];
        if (req.method === 'DELETE') {
          await salariesCollection.deleteOne({ id });
          return res.json({ success: true });
        }
      } else {
        if (req.method === 'GET') {
          const { userId, month } = req.query;
          const query: any = {};
          if (userId) {
            query.userId = userId;
          }
          if (month) {
            query.month = month;
          }
          const salaries = await salariesCollection.find(query).toArray();
          return res.json(salaries.map(formatSalary));
        }
        if (req.method === 'POST') {
          const salary = req.body;
          const id = salary.id || uuidv4();
          
          // Calculate total deductions
          const advances = salary.advances || [];
          const storePurchases = salary.storePurchases || [];
          const totalDeductions = advances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0) +
                                  storePurchases.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          
          // Calculate final pay (after deductions)
          const calcPay = salary.type === 'hourly' ? salary.base * salary.hours : salary.base;
          const finalPay = calcPay + (salary.adjustments || 0) - totalDeductions;
          
          const salaryDoc = {
            id,
            userId: salary.userId,
            month: salary.month,
            type: salary.type,
            base: salary.base,
            hours: salary.hours || 0,
            calcPay,
            adjustments: salary.adjustments || 0,
            advances,
            storePurchases,
            totalDeductions,
            finalPay,
            paid: salary.paid ? 1 : 0,
            paidDate: salary.paidDate,
            note: salary.note || null
          };
          
          await salariesCollection.replaceOne(
            { userId: salary.userId, month: salary.month },
            salaryDoc,
            { upsert: true }
          );
          const result = await salariesCollection.findOne({ id });
          return res.json(formatSalary(result));
        }
      }
    }

    // Salary History routes
    if (segments[0] === 'salaryHistory') {
      const salaryHistoryCollection = await getCollection('salaryHistory');
      if (req.method === 'GET') {
        const { userId } = req.query;
        const query: any = {};
        if (userId) {
          query.userId = userId;
        }
        const history = await salaryHistoryCollection
          .find(query)
          .sort({ date: -1 })
          .toArray();
        return res.json(history);
      }
      if (req.method === 'POST') {
        const entry = req.body;
        const id = entry.id || uuidv4();
        await salaryHistoryCollection.insertOne({ ...entry, id });
        return res.json({ ...entry, id });
      }
    }

    // Pending Advances routes
    if (segments[0] === 'pendingAdvances') {
      const pendingAdvancesCollection = await getCollection('pendingAdvances');
      if (req.method === 'GET') {
        const { userId } = req.query;
        const query: any = { deducted: { $ne: true } };
        if (userId) {
          query.userId = userId;
        }
        const advances = await pendingAdvancesCollection.find(query).toArray();
        return res.json(advances);
      }
      if (req.method === 'POST') {
        const advance = req.body;
        const id = advance.id || uuidv4();
        await pendingAdvancesCollection.insertOne({
          ...advance,
          id,
          deducted: false,
          createdAt: new Date().toISOString()
        });
        return res.json({ ...advance, id });
      }
      if (req.method === 'PUT' && segments[1]) {
        const id = segments[1];
        await pendingAdvancesCollection.updateOne(
          { id },
          { $set: { deducted: true, deductedInSalaryId: req.body.salaryId } }
        );
        return res.json({ success: true });
      }
      if (req.method === 'DELETE' && segments[1]) {
        const id = segments[1];
        await pendingAdvancesCollection.deleteOne({ id });
        return res.json({ success: true });
      }
    }

    // Pending Store Purchases routes
    if (segments[0] === 'pendingStorePurchases') {
      const pendingStorePurchasesCollection = await getCollection('pendingStorePurchases');
      if (req.method === 'GET') {
        const { userId } = req.query;
        const query: any = { deducted: { $ne: true } };
        if (userId) {
          query.userId = userId;
        }
        const purchases = await pendingStorePurchasesCollection.find(query).toArray();
        return res.json(purchases);
      }
      if (req.method === 'POST') {
        const purchase = req.body;
        const id = purchase.id || uuidv4();
        await pendingStorePurchasesCollection.insertOne({
          ...purchase,
          id,
          deducted: false,
          createdAt: new Date().toISOString()
        });
        return res.json({ ...purchase, id });
      }
      if (req.method === 'PUT' && segments[1]) {
        const id = segments[1];
        await pendingStorePurchasesCollection.updateOne(
          { id },
          { $set: { deducted: true, deductedInSalaryId: req.body.salaryId } }
        );
        return res.json({ success: true });
      }
      if (req.method === 'DELETE' && segments[1]) {
        const id = segments[1];
        await pendingStorePurchasesCollection.deleteOne({ id });
        return res.json({ success: true });
      }
    }

    // Announcements routes
    if (segments[0] === 'announcements') {
      const announcementsCollection = await getCollection('announcements');
      if (segments[1] && segments[2] === 'read' && req.method === 'PUT') {
        const id = segments[1];
        const { userId } = req.body;
        const announcement = await announcementsCollection.findOne({ id });
        if (!announcement) return res.status(404).json({ error: 'Not found' });
        const readBy = announcement.readBy || [];
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          await announcementsCollection.updateOne(
            { id },
            { $set: { readBy } }
          );
        }
        return res.json({ success: true });
      } else if (!segments[1]) {
        if (req.method === 'GET') {
          const announcements = await announcementsCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
          return res.json(announcements.map(ann => ({
            ...ann,
            createdAt: new Date(ann.createdAt),
            expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : null,
            readBy: ann.readBy || []
          })));
        }
        if (req.method === 'POST') {
          const { title, body, expiresAt } = req.body;
          const id = uuidv4();
          const announcement = {
            id,
            title,
            body,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt || null,
            readBy: []
          };
          await announcementsCollection.insertOne(announcement);
          return res.json({
            ...announcement,
            createdAt: new Date(announcement.createdAt),
            expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : null
          });
        }
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('API Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
