import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCollection,
  formatUser,
  formatAttendance,
  formatNote,
  formatLeave,
  formatSalary,
  compressNoteText,
  formatAnnouncement,
} from './mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from 'mongodb';
import type {
  AnnouncementDocument,
  AttendanceDocument,
  AttendancePunch,
  AttendancePunchType,
  LeaveDocument,
  NoteDocument,
  PendingAdvanceDocument,
  PendingStorePurchaseDocument,
  SalaryDocument,
  SalaryHistoryDocument,
  UserDocument,
} from './mongodb.js';

type ApiMethod = NonNullable<VercelRequest['method']>;

type ApiHandler = (
  req: VercelRequest,
  res: VercelResponse,
  context: { segments: string[]; method: ApiMethod }
) => Promise<boolean> | boolean;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getRequestBody(req: VercelRequest): UnknownRecord {
  const rawBody: unknown = req.body;
  return isRecord(rawBody) ? rawBody : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getPathSegments(req: VercelRequest): string[] {
  if (Array.isArray(req.query.path)) {
    return req.query.path.filter(Boolean);
  }

  if (typeof req.query.path === 'string') {
    return req.query.path.split('/').filter(Boolean);
  }

  if (req.url) {
    const url = new URL(req.url, 'https://placeholder.local');
    return url.pathname
      .replace(/^\/?api\/?/, '')
      .split('/')
      .filter(Boolean);
  }

  return [];
}

function json(res: VercelResponse, status: number, payload: unknown): true {
  res.status(status).json(payload);
  return true;
}

function methodNotAllowed(res: VercelResponse, method: ApiMethod, allowed: ApiMethod[]): true {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: `Method ${method} not allowed` });
  return true;
}

function calculateTotals(punches: AttendancePunch[]): { workMin: number; breakMin: number } {
  let workMin = 0;
  let breakMin = 0;
  let lastIn: number | null = null;
  let lastBreakStart: number | null = null;
  const now = Date.now();

  for (const punch of punches) {
    const punchTime = new Date(punch.at).getTime();

    switch (punch.type) {
      case 'IN':
        lastIn = punchTime;
        break;
      case 'OUT':
        if (lastIn) {
          workMin += (punchTime - lastIn) / 60000;
          lastIn = null;
        }
        break;
      case 'BREAK_START':
        if (lastIn) {
          workMin += (punchTime - lastIn) / 60000;
          lastBreakStart = punchTime;
          lastIn = null;
        }
        break;
      case 'BREAK_END':
        if (lastBreakStart) {
          breakMin += (punchTime - lastBreakStart) / 60000;
          lastIn = punchTime;
          lastBreakStart = null;
        }
        break;
    }
  }

  if (lastIn) {
    workMin += (now - lastIn) / 60000;
  }

  return {
    workMin: Math.round(workMin),
    breakMin: Math.round(breakMin),
  };
}

async function ensureAdmin(userId: string): Promise<boolean> {
  const usersCollection = await getCollection<UserDocument>('users');
  const user = await usersCollection.findOne({ id: userId });
  return user?.role === 'admin';
}

const handleHealth: ApiHandler = (_, res, context) => {
  if (context.segments.length === 0) {
    return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  if (context.segments[0] === 'health' && context.method === 'GET') {
    return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  return false;
};

const handleAuth: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'auth' || context.segments[1] !== 'login') {
    return false;
  }

  if (context.method !== 'POST') {
    return methodNotAllowed(res, context.method, ['POST']);
  }

  const body = getRequestBody(req);
  const pin = getString(body.pin);

  if (!pin) {
    return json(res, 400, { error: 'PIN is required' });
  }

  const usersCollection = await getCollection<UserDocument>('users');
  const user = await usersCollection.findOne({ pin });

  if (!user) {
    return json(res, 401, { error: 'Invalid PIN' });
  }

  return json(res, 200, formatUser(user));
};

const handleUsers: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'users') {
    return false;
  }

  const usersCollection = await getCollection<UserDocument>('users');
  const id = context.segments[1];

  if (!id) {
    if (context.method === 'GET') {
      const users = await usersCollection.find({}).toArray();
      return json(res, 200, users.map(formatUser));
    }

    if (context.method === 'POST') {
      const body = getRequestBody(req);
      const name = getString(body.name);
      const role = getString(body.role) as UserDocument['role'] | undefined;
      const pin = getString(body.pin);
      const baseSalary = getNumber(body.baseSalary);

      if (!name || !role || !pin) {
        return json(res, 400, { error: 'name, role and pin are required' });
      }

      const user: UserDocument = {
        id: uuidv4(),
        name,
        role,
        pin,
        baseSalary: baseSalary ?? null,
      };

      await usersCollection.insertOne(user);
      return json(res, 200, formatUser(user));
    }

    return methodNotAllowed(res, context.method, ['GET', 'POST']);
  }

  if (context.method === 'GET') {
    const user = await usersCollection.findOne({ id });
    if (!user) {
      return json(res, 404, { error: 'User not found' });
    }
    return json(res, 200, formatUser(user));
  }

  if (context.method === 'PUT') {
    const body = getRequestBody(req);
    const name = getString(body.name);
    const role = getString(body.role) as UserDocument['role'] | undefined;
    const pin = getString(body.pin);
    const baseSalary = getNumber(body.baseSalary);
    const updates: Partial<UserDocument> = {};
    if (name !== undefined) {
      updates.name = name;
    }
    if (role !== undefined) {
      updates.role = role;
    }
    if (pin !== undefined) {
      updates.pin = pin;
    }
    if (baseSalary !== undefined) {
      updates.baseSalary = baseSalary;
    }
    await usersCollection.updateOne({ id }, { $set: updates });
    const user = await usersCollection.findOne({ id });
    return json(res, 200, formatUser(user));
  }

  if (context.method === 'DELETE') {
    await usersCollection.deleteOne({ id });
    await (await getCollection<AttendanceDocument>('attendance')).deleteMany({ userId: id });
    await (await getCollection<NoteDocument>('notes')).deleteMany({ createdBy: id });
    await (await getCollection<LeaveDocument>('leaves')).deleteMany({ userId: id });
    await (await getCollection<SalaryDocument>('salaries')).deleteMany({ userId: id });
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'PUT', 'DELETE']);
};

const handleAttendance: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'attendance') {
    return false;
  }

  const attendanceCollection = await getCollection<AttendanceDocument>('attendance');
  const action = context.segments[1];

  if (action === 'punch') {
    if (context.method !== 'POST') {
      return methodNotAllowed(res, context.method, ['POST']);
    }

    const body = getRequestBody(req);
    const userId = getString(body.userId);
    const type = getString(body.type) as AttendancePunchType | undefined;
    const manualPunch = getBoolean(body.manualPunch) ?? false;
    const punchedBy = getString(body.punchedBy);
    const reason = getString(body.reason);
    const customTime = getString(body.customTime);

    if (!userId || !type) {
      return json(res, 400, { error: 'userId and type are required' });
    }

    if (manualPunch && punchedBy && !(await ensureAdmin(punchedBy))) {
      return json(res, 403, { error: 'Only admins can perform manual punches' });
    }

    const punchDate = customTime
      ? new Date(customTime).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const punchTime = customTime ? new Date(customTime) : new Date();

    let attendance = await attendanceCollection.findOne({ userId, date: punchDate });

    if (!attendance) {
      attendance = {
        id: uuidv4(),
        userId,
        date: punchDate,
        punches: [],
        totals: { workMin: 0, breakMin: 0 },
      };
      await attendanceCollection.insertOne(attendance);
    }

    const current = formatAttendance(attendance);
    const punches = [...current.punches];

    const newPunch: AttendancePunch = {
      at: punchTime.toISOString(),
      type,
    };

    if (manualPunch) {
      newPunch.manualPunch = true;
      if (punchedBy) {
        newPunch.punchedBy = punchedBy;
      }
      if (reason) {
        newPunch.reason = reason;
      }
    }

    punches.push(newPunch);
    const totals = calculateTotals(punches);

    await attendanceCollection.updateOne({ id: attendance.id }, { $set: { punches, totals } });
    const updated = await attendanceCollection.findOne({ id: attendance.id });
    return json(res, 200, formatAttendance(updated));
  }

  if (action === 'today' && context.segments[2]) {
    if (context.method !== 'GET') {
      return methodNotAllowed(res, context.method, ['GET']);
    }

    const userId = context.segments[2];
    const today = new Date().toISOString().split('T')[0];
    const attendance = await attendanceCollection.findOne({ userId, date: today });
    return json(res, 200, attendance ? formatAttendance(attendance) : null);
  }

  if (action === 'history' && context.segments[2]) {
    if (context.method !== 'GET') {
      return methodNotAllowed(res, context.method, ['GET']);
    }

    const userId = context.segments[2];
    const limitParam = req.query.limit;
    const limit = typeof limitParam === 'string' ? parseInt(limitParam, 10) : 30;
    const attendances = await attendanceCollection
      .find({ userId })
      .sort({ date: -1 })
      .limit(Number.isNaN(limit) ? 30 : limit)
      .toArray();
    return json(res, 200, attendances.map(formatAttendance));
  }

  if (action === 'all') {
    if (context.method !== 'GET') {
      return methodNotAllowed(res, context.method, ['GET']);
    }

    const attendances = await attendanceCollection.find({}).sort({ date: -1 }).toArray();
    return json(res, 200, attendances.map(formatAttendance));
  }

  if (action === 'clear') {
    if (context.method !== 'DELETE') {
      return methodNotAllowed(res, context.method, ['DELETE']);
    }

    const body = getRequestBody(req);
    const adminId = getString(body.adminId);

    // Verify admin
    if (adminId && !(await ensureAdmin(adminId))) {
      return json(res, 403, { error: 'Only admins can clear attendance records' });
    }

    const result = await attendanceCollection.deleteMany({});

    return json(res, 200, {
      message: 'All attendance records cleared successfully',
      deletedCount: result.deletedCount
    });
  }

  return false;
};

const handleNotes: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'notes') {
    return false;
  }

  const notesCollection = await getCollection<NoteDocument>('notes');
  const id = context.segments[1];

  if (!id) {
    if (context.method === 'GET') {
      const deleted = req.query.deleted;
      const userId = req.query.userId;
      const includeDeleted = deleted === 'true';
      const query: Filter<NoteDocument> = includeDeleted ? { deleted: true } : { deleted: { $ne: true } };
      if (includeDeleted && typeof userId === 'string') {
        query.deletedBy = userId;
      }
      const notes = await notesCollection.find(query).sort({ createdAt: -1 }).toArray();
      return json(res, 200, notes.map(formatNote));
    }

    if (context.method === 'POST') {
      const body = getRequestBody(req);
      const text = getString(body.text);
      const createdBy = getString(body.createdBy);
      const category = getString(body.category);
      const subCategory = getString(body.subCategory) as 'refill-stock' | 'remove-from-stock' | 'out-of-stock' | undefined;
      const adminOnly = getBoolean(body.adminOnly) ?? false;

      if (!text || !createdBy) {
        return json(res, 400, { error: 'text and createdBy are required' });
      }

      const { textCompressed, textLength, textHash } = compressNoteText(text);
      const now = new Date().toISOString();
      const note: NoteDocument = {
        id: uuidv4(),
        textCompressed,
        textLength,
        textHash,
        createdBy,
        createdAt: now,
        status: 'pending',
        category: category || 'general',
        subCategory: category === 'reminder' ? subCategory : undefined,
        adminOnly,
      };

      await notesCollection.insertOne(note);
      const inserted = await notesCollection.findOne({ id: note.id });
      return json(res, 200, formatNote(inserted ?? note));
    }

    return methodNotAllowed(res, context.method, ['GET', 'POST']);
  }

  if (context.method === 'PUT') {
    const body = getRequestBody(req);
    const text = getString(body.text);
    const status = getString(body.status);
    const category = getString(body.category);
    const subCategory = getString(body.subCategory) as 'refill-stock' | 'remove-from-stock' | 'out-of-stock' | undefined;
    const adminOnly = getBoolean(body.adminOnly);
    const update: Partial<NoteDocument> = {};

    if (status !== undefined) {
      update.status = status;
    }
    if (category !== undefined) {
      update.category = category;
      // Only set subCategory if category is reminder
      if (category === 'reminder') {
        update.subCategory = subCategory;
      } else {
        update.subCategory = undefined;
      }
    } else if (subCategory !== undefined) {
      // If only subCategory is being updated (and category is already reminder)
      update.subCategory = subCategory;
    }
    if (adminOnly !== undefined) {
      update.adminOnly = adminOnly;
    }

    if (text !== undefined) {
      const { textCompressed, textLength, textHash } = compressNoteText(text);
      update.textCompressed = textCompressed;
      update.textLength = textLength;
      update.textHash = textHash;
      update.updatedAt = new Date().toISOString();
    }

    await notesCollection.updateOne(
      { id },
      { $set: update, $unset: { text: '' } }
    );
    const note = await notesCollection.findOne({ id });
    return json(res, 200, formatNote(note));
  }

  if (context.method === 'DELETE') {
    const body = getRequestBody(req);
    const deletedBy = getString(body.deletedBy);

    if (deletedBy) {
      await notesCollection.updateOne(
        { id },
        { $set: { deleted: true, deletedAt: new Date().toISOString(), deletedBy } }
      );
    } else {
      await notesCollection.deleteOne({ id });
    }

    return json(res, 200, { success: true });
  }

  if (context.method === 'POST' && context.segments[2] === 'restore') {
    await notesCollection.updateOne(
      { id },
      { $set: { deleted: false, deletedAt: null, deletedBy: null } }
    );
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['DELETE', 'PUT', 'POST']);
};

const handleBootstrap: ApiHandler = async (_req, res, context) => {
  if (context.segments[0] !== 'bootstrap') {
    return false;
  }

  if (context.method !== 'GET') {
    return methodNotAllowed(res, context.method, ['GET']);
  }

  const [
    usersCollection,
    notesCollection,
    leavesCollection,
    salariesCollection,
    attendanceCollection,
    salaryHistoryCollection,
    pendingAdvancesCollection,
    pendingStorePurchasesCollection,
    announcementsCollection,
  ] = await Promise.all([
    getCollection<UserDocument>('users'),
    getCollection<NoteDocument>('notes'),
    getCollection<LeaveDocument>('leaves'),
    getCollection<SalaryDocument>('salaries'),
    getCollection<AttendanceDocument>('attendance'),
    getCollection<SalaryHistoryDocument>('salaryHistory'),
    getCollection<PendingAdvanceDocument>('pendingAdvances'),
    getCollection<PendingStorePurchaseDocument>('pendingStorePurchases'),
    getCollection<AnnouncementDocument>('announcements'),
  ]);

  const [users, notes, leaves, salaries, attendance, salaryHistory, pendingAdvances, pendingStorePurchases, announcements] =
    await Promise.all([
      usersCollection.find({}).project({ _id: 0 }).toArray(),
      notesCollection
        .find({}, { sort: { createdAt: -1 } })
        .project({ _id: 0 })
        .toArray(),
      leavesCollection.find({}).project({ _id: 0 }).toArray(),
      salariesCollection.find({}).project({ _id: 0 }).toArray(),
      attendanceCollection.find({}).project({ _id: 0 }).toArray(),
      salaryHistoryCollection.find({}).project({ _id: 0 }).toArray(),
      pendingAdvancesCollection.find({}).project({ _id: 0 }).toArray(),
      pendingStorePurchasesCollection.find({}).project({ _id: 0 }).toArray(),
      announcementsCollection.find({}, { sort: { createdAt: -1 } }).project({ _id: 0 }).toArray(),
    ]);

  return json(res, 200, {
    users: users.map(formatUser),
    notes: notes.map(formatNote),
    leaves: leaves.map(formatLeave),
    salaries: salaries.map(formatSalary),
    attendance: attendance.map(formatAttendance),
    salaryHistory,
    pendingAdvances,
    pendingStorePurchases,
    announcements: announcements.map(formatAnnouncement),
  });
};

const handleLeaves: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'leaves') {
    return false;
  }

  const leavesCollection = await getCollection<LeaveDocument>('leaves');
  const id = context.segments[1];

  if (!id) {
    if (context.method === 'GET') {
      const userId = req.query.userId;
      const query: Filter<LeaveDocument> = typeof userId === 'string' ? { userId } : {};
      const leaves = await leavesCollection.find(query).sort({ date: -1 }).toArray();
      return json(res, 200, leaves.map(formatLeave));
    }

    if (context.method === 'POST') {
      const body = getRequestBody(req);
      const userId = getString(body.userId);
      const date = getString(body.date);
      const type = getString(body.type);
      const reason = getString(body.reason);

      if (!userId || !date || !type) {
        return json(res, 400, { error: 'userId, date and type are required' });
      }

      const leave: LeaveDocument = {
        id: uuidv4(),
        userId,
        date,
        type,
        reason,
        status: 'pending',
      };

      await leavesCollection.insertOne(leave);
      return json(res, 200, formatLeave(leave));
    }

    return methodNotAllowed(res, context.method, ['GET', 'POST']);
  }

  if (context.method === 'PUT') {
    const body = getRequestBody(req);
    const status = getString(body.status);
    if (status !== undefined) {
      await leavesCollection.updateOne({ id }, { $set: { status } });
    }
    const leave = await leavesCollection.findOne({ id });
    return json(res, 200, formatLeave(leave));
  }

  if (context.method === 'DELETE') {
    await leavesCollection.deleteOne({ id });
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['PUT', 'DELETE']);
};

const handleSalaries: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'salaries') {
    return false;
  }

  const salariesCollection = await getCollection<SalaryDocument>('salaries');
  const id = context.segments[1];

  if (id && context.method === 'DELETE') {
    await salariesCollection.deleteOne({ id });
    return json(res, 200, { success: true });
  }

  if (context.method === 'GET') {
    const userId = req.query.userId;
    const month = req.query.month;
    const query: Filter<SalaryDocument> = {};
    if (typeof userId === 'string') {
      query.userId = userId;
    }
    if (typeof month === 'string') {
      query.month = month;
    }
    const salaries = await salariesCollection.find(query).sort({ month: -1 }).toArray();
    return json(res, 200, salaries.map(formatSalary));
  }

  if (context.method === 'POST') {
    const body = getRequestBody(req);
    const newSalary: SalaryDocument = {
      id: uuidv4(),
      userId: getString(body.userId) ?? '',
      month: getString(body.month) ?? '',
      type: getString(body.type),
      base: getNumber(body.base),
      hours: getNumber(body.hours),
      calcPay: getNumber(body.calcPay),
      adjustments: getNumber(body.adjustments),
      advances: Array.isArray(body.advances) ? body.advances : undefined,
      storePurchases: Array.isArray(body.storePurchases) ? body.storePurchases : undefined,
      totalDeductions: getNumber(body.totalDeductions),
      finalPay: getNumber(body.finalPay),
      paid: typeof body.paid === 'boolean' || typeof body.paid === 'number' ? (body.paid as number | boolean) : undefined,
      paidDate: getString(body.paidDate),
      note: getString(body.note),
    };
    if (!newSalary.userId || !newSalary.month) {
      return json(res, 400, { error: 'userId and month are required to create salary records' });
    }
    await salariesCollection.insertOne(newSalary);
    return json(res, 200, formatSalary(newSalary));
  }

  if (context.method === 'PUT') {
    const body = getRequestBody(req);
    const salaryId = getString(body.id);
    if (!salaryId) {
      return json(res, 400, { error: 'id is required to update salary' });
    }
    const updates: Partial<SalaryDocument> = {};
    const updateKeys: Array<keyof SalaryDocument> = [
      'userId',
      'month',
      'type',
      'base',
      'hours',
      'calcPay',
      'adjustments',
      'advances',
      'storePurchases',
      'totalDeductions',
      'finalPay',
      'paid',
      'paidDate',
      'note',
    ];
    for (const key of updateKeys) {
      const value = (body as UnknownRecord)[key as string];
      if (value !== undefined) {
        (updates as UnknownRecord)[key as string] = value;
      }
    }
    await salariesCollection.updateOne({ id: salaryId }, { $set: updates });
    const updated = await salariesCollection.findOne({ id: salaryId });
    return json(res, 200, formatSalary(updated));
  }

  return methodNotAllowed(res, context.method, ['GET', 'POST', 'PUT', 'DELETE']);
};

const handleSalaryHistory: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'salaryHistory') {
    return false;
  }

  const salaryHistoryCollection = await getCollection<SalaryHistoryDocument>('salaryHistory');

  if (context.method === 'GET') {
    const userId = req.query.userId;
    const query: Filter<SalaryHistoryDocument> = typeof userId === 'string' ? { userId } : {};
    const history = await salaryHistoryCollection.find(query).sort({ date: -1 }).toArray();
    return json(res, 200, history);
  }

  if (context.method === 'POST') {
    const body = getRequestBody(req);
    const entry: SalaryHistoryDocument = {
      id: uuidv4(),
      userId: getString(body.userId) ?? '',
      date: getString(body.date) ?? new Date().toISOString(),
      oldBaseSalary: typeof body.oldBaseSalary === 'number' ? body.oldBaseSalary : null,
      newBaseSalary: getNumber(body.newBaseSalary) ?? 0,
      changedBy: getString(body.changedBy) ?? '',
      reason: getString(body.reason),
    };
    await salaryHistoryCollection.insertOne(entry);
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'POST']);
};

const handlePendingAdvances: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'pendingAdvances') {
    return false;
  }

  const pendingAdvancesCollection = await getCollection<PendingAdvanceDocument>('pendingAdvances');
  const id = context.segments[1];

  if (context.method === 'GET') {
    const userId = req.query.userId;
    const query: Filter<PendingAdvanceDocument> = { deducted: { $ne: true } };
    if (typeof userId === 'string') {
      query.userId = userId;
    }
    const advances = await pendingAdvancesCollection.find(query).sort({ date: -1 }).toArray();
    return json(res, 200, advances);
  }

  if (context.method === 'POST') {
    const body = getRequestBody(req);
    const newAdvance: PendingAdvanceDocument = {
      id: uuidv4(),
      userId: getString(body.userId) ?? '',
      date: getString(body.date) ?? new Date().toISOString(),
      amount: getNumber(body.amount) ?? 0,
      description: getString(body.description),
      deducted: false,
      createdAt: getString(body.createdAt) ?? new Date().toISOString(),
      deductedInSalaryId: getString(body.deductedInSalaryId),
    };
    if (!newAdvance.userId) {
      return json(res, 400, { error: 'userId is required to create a pending advance' });
    }
    await pendingAdvancesCollection.insertOne(newAdvance);
    return json(res, 200, newAdvance);
  }

  if (context.method === 'PUT' && id) {
    await pendingAdvancesCollection.updateOne({ id }, { $set: { deducted: true } });
    return json(res, 200, { success: true });
  }

  if (context.method === 'DELETE' && id) {
    await pendingAdvancesCollection.deleteOne({ id });
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'POST', 'PUT', 'DELETE']);
};

const handlePendingStorePurchases: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'pendingStorePurchases') {
    return false;
  }

  const pendingStorePurchasesCollection = await getCollection<PendingStorePurchaseDocument>('pendingStorePurchases');
  const id = context.segments[1];

  if (context.method === 'GET') {
    const userId = req.query.userId;
    const query: Filter<PendingStorePurchaseDocument> = { deducted: { $ne: true } };
    if (typeof userId === 'string') {
      query.userId = userId;
    }
    const purchases = await pendingStorePurchasesCollection.find(query).sort({ date: -1 }).toArray();
    return json(res, 200, purchases);
  }

  if (context.method === 'POST') {
    const body = getRequestBody(req);
    const newPurchase: PendingStorePurchaseDocument = {
      id: uuidv4(),
      userId: getString(body.userId) ?? '',
      date: getString(body.date) ?? new Date().toISOString(),
      amount: getNumber(body.amount) ?? 0,
      description: getString(body.description),
      deducted: false,
      createdAt: getString(body.createdAt) ?? new Date().toISOString(),
      deductedInSalaryId: getString(body.deductedInSalaryId),
    };
    if (!newPurchase.userId) {
      return json(res, 400, { error: 'userId is required to create a pending purchase' });
    }
    await pendingStorePurchasesCollection.insertOne(newPurchase);
    return json(res, 200, newPurchase);
  }

  if (context.method === 'PUT' && id) {
    await pendingStorePurchasesCollection.updateOne({ id }, { $set: { deducted: true } });
    return json(res, 200, { success: true });
  }

  if (context.method === 'DELETE' && id) {
    await pendingStorePurchasesCollection.deleteOne({ id });
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'POST', 'PUT', 'DELETE']);
};

const handleAnnouncements: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'announcements') {
    return false;
  }

  const announcementsCollection = await getCollection<AnnouncementDocument>('announcements');
  const id = context.segments[1];

  if (id && context.segments[2] === 'read') {
    if (context.method !== 'PUT') {
      return methodNotAllowed(res, context.method, ['PUT']);
    }

    const body = getRequestBody(req);
    const userId = getString(body.userId);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    const announcement = await announcementsCollection.findOne({ id });
    if (!announcement) {
      return json(res, 404, { error: 'Not found' });
    }

    const readBy = Array.isArray(announcement.readBy) ? [...announcement.readBy] : [];

    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await announcementsCollection.updateOne({ id }, { $set: { readBy } });
    }

    return json(res, 200, { success: true });
  }

  if (!id) {
    if (context.method === 'GET') {
      const announcements = await announcementsCollection.find({}).sort({ createdAt: -1 }).toArray();
      const response = announcements.map(announcement => {
        const formatted = formatAnnouncement(announcement);
        return {
          ...formatted,
          createdAt: new Date(formatted.createdAt),
          expiresAt: formatted.expiresAt ? new Date(formatted.expiresAt) : null,
        };
      });
      return json(
        res,
        200,
        response
      );
    }

    if (context.method === 'POST') {
      const body = getRequestBody(req);
      const title = getString(body.title);
      const content = getString(body.body);
      const expiresAt = getString(body.expiresAt);

      if (!title || !content) {
        return json(res, 400, { error: 'title and body are required' });
      }

      const announcement: AnnouncementDocument = {
        id: uuidv4(),
        title,
        body: content,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        readBy: [] as string[],
      };

      await announcementsCollection.insertOne(announcement);

      return json(res, 200, {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body ?? '',
        createdAt: new Date(announcement.createdAt),
        expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : null,
      });
    }
  }

  return methodNotAllowed(res, context.method, ['GET', 'POST', 'PUT']);
};

const routeHandlers: ApiHandler[] = [
  handleAuth,
  handleUsers,
  handleAttendance,
  handleNotes,
  handleBootstrap,
  handleLeaves,
  handleSalaries,
  handleSalaryHistory,
  handlePendingAdvances,
  handlePendingStorePurchases,
  handleAnnouncements,
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const method = (req.method || 'GET') as ApiMethod;
  const segments = getPathSegments(req);
  const context = { segments, method } as const;

  if (handleHealth(req, res, context)) {
    return;
  }

  try {
    for (const routeHandler of routeHandlers) {
      const handled = await routeHandler(req, res, context);
      if (handled) {
        return;
      }
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = isRecord(error) && typeof error.message === 'string' ? error.message : undefined;
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
    });
  }
}
