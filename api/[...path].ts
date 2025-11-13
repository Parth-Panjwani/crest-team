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
  NotificationDocument,
  PendingAdvanceDocument,
  PendingStorePurchaseDocument,
  SalaryDocument,
  SalaryHistoryDocument,
  UserDocument,
  ChatDocument,
  ChatMessageDocument,
  FileAttachment,
} from './mongodb.js';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// Initialize Firebase Admin SDK
let firebaseAdmin: admin.app.App | null = null;

function initializeFirebase(): void {
  // Check if Firebase is already initialized
  try {
    firebaseAdmin = admin.app();
    console.log('✅ Firebase Admin SDK already initialized');
    return;
  } catch {
    // App doesn't exist yet, continue to initialize
  }

  if (firebaseAdmin) {
    return;
  }

  // Get raw env vars first for debugging
  const rawProjectId = process.env.FIREBASE_PROJECT_ID;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  console.log('🔍 Firebase Environment Variables Check:');
  console.log('  FIREBASE_PROJECT_ID:', rawProjectId ? `✅ Set (${rawProjectId.length} chars)` : '❌ Missing');
  console.log('  FIREBASE_CLIENT_EMAIL:', rawClientEmail ? `✅ Set (${rawClientEmail.length} chars)` : '❌ Missing');
  console.log('  FIREBASE_PRIVATE_KEY:', rawPrivateKey ? `✅ Set (${rawPrivateKey.length} chars, starts with: ${rawPrivateKey.substring(0, 30)}...)` : '❌ Missing');

  const projectId = rawProjectId?.trim();
  const privateKey = rawPrivateKey?.replace(/\\n/g, '\n').trim();
  const clientEmail = rawClientEmail?.trim();

  if (!projectId || !privateKey || !clientEmail) {
    console.warn('⚠️  Firebase credentials not configured. Push notifications will be disabled.');
    console.warn('Missing:', {
      hasProjectId: !!projectId,
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!clientEmail,
      projectIdLength: projectId?.length || 0,
      privateKeyLength: privateKey?.length || 0,
      clientEmailLength: clientEmail?.length || 0,
    });
    return;
  }

  // Validate private key format
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    console.error('❌ Invalid private key format - missing BEGIN/END markers');
    return;
  }

  try {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('  Project ID:', projectId);
    console.log('  Client Email:', clientEmail);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    firebaseAdmin = null;
  }
}

// Send push notification to a user
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  // Initialize Firebase if not already initialized
  if (!firebaseAdmin) {
    initializeFirebase();
  }

  if (!firebaseAdmin) {
    console.warn('⚠️  Firebase Admin SDK not initialized. Cannot send push notification.');
    return;
  }

  try {
    const usersCollection = await getCollection<UserDocument>('users');
    const user = await usersCollection.findOne({ id: userId });

    if (!user || !(user as any).fcmToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️  No FCM token found for user ${userId} - push notifications disabled`);
      }
      return;
    }

    const message: admin.messaging.Message = {
      token: (user as any).fcmToken,
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
      webpush: {
        notification: { title, body, icon: '/logo.png', badge: '/logo.png' },
        fcmOptions: { link: '/dashboard' },
      },
    };

    await firebaseAdmin.messaging().send(message);
  } catch (error) {
    console.error(`❌ Failed to send push notification to user ${userId}:`, error);
  }
}

// Send push notification and create in-app notification
async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  notificationType: 'punch' | 'leave' | 'note' | 'salary' | 'announcement' | 'chat' = 'note'
): Promise<void> {
  try {
    await sendPushNotification(userId, title, body, data);

    const notificationsCollection = await getCollection<NotificationDocument>('notifications');
    const notification: NotificationDocument = {
      id: uuidv4(),
      type: notificationType,
      title,
      message: body,
      targetUserId: userId,
      read: false,
      createdAt: new Date().toISOString(),
      data: data || {},
    };

    await notificationsCollection.insertOne(notification);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

const handleHealth: ApiHandler = (_, res, context) => {
  if (context.segments.length === 0) {
    return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  if (context.segments[0] === 'health' && context.method === 'GET') {
    return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // Firebase test endpoint
  if (context.segments[0] === 'test-firebase' && context.method === 'GET') {
    initializeFirebase();
    const rawProjectId = process.env.FIREBASE_PROJECT_ID;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    const projectId = rawProjectId?.trim();
    const privateKey = rawPrivateKey?.replace(/\\n/g, '\n').trim();
    const clientEmail = rawClientEmail?.trim();
    
    const hasValidKey = privateKey && privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY');
    
    return json(res, 200, {
      configured: !!(projectId && privateKey && clientEmail),
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      privateKeyValid: hasValidKey,
      privateKeyLength: privateKey?.length || 0,
      firebaseInitialized: !!firebaseAdmin,
      projectId: projectId || null,
      clientEmail: clientEmail || null,
      // Don't expose private key in response!
    });
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
    console.log('[API] 📥 Request body received:', JSON.stringify(body, null, 2));
    console.log('[API] 📥 body.selfieUrl type:', typeof body.selfieUrl, 'value:', body.selfieUrl);
    
    const userId = getString(body.userId);
    const type = getString(body.type) as AttendancePunchType | undefined;
    const manualPunch = getBoolean(body.manualPunch) ?? false;
    const punchedBy = getString(body.punchedBy);
    const reason = getString(body.reason);
    const customTime = getString(body.customTime);
    const remotePunch = getBoolean(body.remotePunch) ?? false;
    const location = getString(body.location);
    const selfieUrl = getString(body.selfieUrl);
    
    console.log('[API] 📥 Extracted selfieUrl:', selfieUrl, 'type:', typeof selfieUrl);

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
      const newAttendance: AttendanceDocument = {
        id: uuidv4(),
        userId,
        date: punchDate,
        punches: [],
        totals: { workMin: 0, breakMin: 0 },
      };
      await attendanceCollection.insertOne(newAttendance);
      attendance = await attendanceCollection.findOne({ userId, date: punchDate });
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
    
    if (remotePunch) {
      newPunch.remotePunch = true;
    }
    
    if (location) {
      newPunch.location = location;
    }
    
    // Store reason for break punches or remote check-ins
    if ((type === 'BREAK_START' || type === 'BREAK_END' || remotePunch) && reason) {
      newPunch.reason = reason;
    }
    
    // Add selfieUrl - MUST be after all other fields to ensure it's not overwritten
    if (selfieUrl) {
      newPunch.selfieUrl = selfieUrl;
      console.log('[API] ✅ Adding selfieUrl to newPunch:', selfieUrl);
      console.log('[API] ✅ newPunch object keys before save:', Object.keys(newPunch));
    } else {
      console.log('[API] ⚠️ No selfieUrl provided. selfieUrl value:', selfieUrl);
    }

    console.log('[API] New punch object (full):', JSON.stringify(newPunch, null, 2));

    // Debug: Verify newPunch has selfieUrl before pushing
    console.log('[API] 🔍 newPunch before push - has selfieUrl:', !!(newPunch as any).selfieUrl, 'value:', (newPunch as any).selfieUrl);
    console.log('[API] 🔍 newPunch keys before push:', Object.keys(newPunch));
    
    punches.push(newPunch);
    
    // Debug: Verify the punch in the array has selfieUrl
    const lastPunch = punches[punches.length - 1];
    console.log('[API] 🔍 Last punch in array - has selfieUrl:', !!(lastPunch as any).selfieUrl, 'value:', (lastPunch as any).selfieUrl);
    console.log('[API] 🔍 Last punch keys:', Object.keys(lastPunch));
    
    const totals = calculateTotals(punches);

    console.log('[API] 🔍 About to save to MongoDB. Total punches:', punches.length);
    console.log('[API] 🔍 Last punch in punches array before save:', JSON.stringify(lastPunch, null, 2));

    await attendanceCollection.updateOne({ id: attendance.id }, { $set: { punches, totals } });
    const updated = await attendanceCollection.findOne({ id: attendance.id });
    
    console.log('[API] 🔍 After MongoDB update - updated document exists:', !!updated);
    
    // Debug: Check raw MongoDB document
    const rawDoc = await attendanceCollection.findOne({ id: attendance.id });
    const lastRawPunch = Array.isArray(rawDoc?.punches) ? rawDoc.punches[rawDoc.punches.length - 1] : null;
    console.log('[API] 🔍 Raw MongoDB last punch:', lastRawPunch ? {
      type: lastRawPunch.type,
      at: lastRawPunch.at,
      selfieUrl: (lastRawPunch as any).selfieUrl,
      allKeys: Object.keys(lastRawPunch || {})
    } : 'NOT FOUND');
    
    console.log('[API] Updated attendance punches (all):', updated?.punches?.map((p: any) => ({ 
      type: p.type, 
      at: p.at, 
      selfieUrl: p.selfieUrl || 'MISSING',
      hasSelfieUrl: !!p.selfieUrl,
      allKeys: Object.keys(p || {})
    })));
    
    // Debug: Check formatted attendance
    const formatted = formatAttendance(updated!);
    const lastFormattedPunch = formatted.punches[formatted.punches.length - 1];
    console.log('[API] 🔍 Formatted last punch:', {
      type: lastFormattedPunch.type,
      at: lastFormattedPunch.at,
      selfieUrl: (lastFormattedPunch as any).selfieUrl || 'MISSING',
      hasSelfieUrl: !!(lastFormattedPunch as any).selfieUrl,
      allKeys: Object.keys(lastFormattedPunch)
    });
    
    console.log('[API] Formatted attendance punches (all):', formatted.punches.map((p: any) => ({
      type: p.type,
      at: p.at,
      selfieUrl: p.selfieUrl || 'MISSING',
      hasSelfieUrl: !!p.selfieUrl,
      allKeys: Object.keys(p)
    })));
    
    // Send push notifications to admins for attendance actions (except manual punches by admin)
    if ((type === 'IN' || type === 'OUT' || type === 'BREAK_START' || type === 'BREAK_END') && !manualPunch) {
      try {
        const usersCollection = await getCollection<UserDocument>('users');
        const user = await usersCollection.findOne({ id: userId });
        const admins = await usersCollection.find({ role: 'admin' }).toArray();
        
        if (user && admins.length > 0) {
          const notificationsCollection = await getCollection<NotificationDocument>('notifications');
          let title = '';
          let message = '';
          
          if (type === 'IN') {
            title = `${user.name} checked in`;
            message = `${user.name} checked in at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (type === 'OUT') {
            title = `${user.name} checked out`;
            message = `${user.name} checked out at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (type === 'BREAK_START') {
            title = `☕ ${user.name} started break`;
            message = `${user.name} started break at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${reason ? ` - Reason: ${reason}` : ''}`;
          } else if (type === 'BREAK_END') {
            title = `✅ ${user.name} ended break`;
            message = `${user.name} ended break at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          }
          
          // Create in-app notifications for all admins
          const notificationPromises = admins.map(admin => {
            const notification: NotificationDocument = {
              id: uuidv4(),
              type: 'punch',
              title,
              message,
              userId,
              targetUserId: admin.id,
              read: false,
              createdAt: new Date().toISOString(),
              data: {
                attendanceId: attendance.id,
                punchType: type,
                punchTime: punchTime.toISOString(),
                reason: reason || '',
              },
            };
            return notificationsCollection.insertOne(notification);
          });
          await Promise.all(notificationPromises);
          
          // Send push notifications to all admins
          for (const admin of admins) {
            await sendPushNotificationToUser(admin.id, title, message, {
              type: 'punch',
              attendanceId: attendance.id,
              punchType: type,
              userId,
            }, 'punch').catch(err => {
              console.error('Failed to send push notification:', err);
            });
          }
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the punch if notification fails
      }
    }
    
    // Final check before returning
    const finalFormatted = formatAttendance(updated);
    const finalLastPunch = finalFormatted.punches[finalFormatted.punches.length - 1];
    console.log('[API] 🚀 FINAL RESPONSE - Last punch:', {
      type: finalLastPunch.type,
      at: finalLastPunch.at,
      selfieUrl: (finalLastPunch as any).selfieUrl || 'MISSING IN FINAL RESPONSE',
      hasSelfieUrl: !!(finalLastPunch as any).selfieUrl,
      allKeys: Object.keys(finalLastPunch)
    });
    
    return json(res, 200, finalFormatted);
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
      const text = getString(body.text) || '';
      const createdBy = getString(body.createdBy);
      const category = getString(body.category);
      const subCategory = getString(body.subCategory) as 'refill-stock' | 'remove-from-stock' | 'out-of-stock' | undefined;
      const adminOnly = getBoolean(body.adminOnly) ?? false;
      const imageUrl = getString(body.imageUrl);

      if (!createdBy) {
        return json(res, 400, { error: 'createdBy is required' });
      }

      if (!text && !imageUrl) {
        return json(res, 400, { error: 'text or imageUrl is required' });
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
        imageUrl: imageUrl || undefined,
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
    const imageUrl = getString(body.imageUrl);
    if (imageUrl !== undefined) {
      update.imageUrl = imageUrl || undefined;
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

const handleFCM: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'fcm' || context.segments[1] !== 'token') {
    return false;
  }

  if (context.method === 'POST') {
    const body = getRequestBody(req);
    const userId = getString(body.userId);
    const token = getString(body.token);

    if (!userId || !token) {
      return json(res, 400, { error: 'userId and token are required' });
    }

    try {
      const usersCollection = await getCollection<UserDocument>('users');
      await usersCollection.updateOne(
        { id: userId },
        { $set: { fcmToken: token } }
      );
      return json(res, 200, { success: true, message: 'FCM token saved' });
    } catch (error) {
      console.error('Save FCM token error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  if (context.method === 'DELETE') {
    const body = getRequestBody(req);
    const userId = getString(body.userId);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    try {
      const usersCollection = await getCollection<UserDocument>('users');
      await usersCollection.updateOne(
        { id: userId },
        { $unset: { fcmToken: '' } }
      );
      return json(res, 200, { success: true, message: 'FCM token removed' });
    } catch (error) {
      console.error('Remove FCM token error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  return methodNotAllowed(res, context.method, ['POST', 'DELETE']);
};

// Stub handlers for features not yet fully implemented
const handleNotifications: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'notifications') {
    return false;
  }

  if (context.method === 'GET') {
    // Return empty array for now - notifications feature not fully implemented
    return json(res, 200, []);
  }

  if (context.method === 'PUT' && context.segments[1] === 'read-all') {
    return json(res, 200, { success: true });
  }

  if (context.method === 'PUT' && context.segments[1] && context.segments[2] === 'read') {
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'PUT']);
};

const handleLatePermissions: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'latePermissions') {
    return false;
  }

  if (context.method === 'GET') {
    // Return empty array for now - late permissions feature not fully implemented
    return json(res, 200, []);
  }

  if (context.method === 'POST') {
    return json(res, 200, { id: 'stub', message: 'Late permissions not yet implemented' });
  }

  if (context.method === 'PUT') {
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'POST', 'PUT']);
};

const handleLateApprovals: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'lateApprovals') {
    return false;
  }

  if (context.method === 'GET') {
    // Return empty array for now - late approvals feature not fully implemented
    return json(res, 200, []);
  }

  if (context.method === 'PUT') {
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, context.method, ['GET', 'PUT']);
};

// S3 Client initialization
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

function getBucketName(): string {
  return process.env.S3_BUCKET_NAME || 'employe-hub';
}

function getPublicFileUrl(key: string): string {
  const region = process.env.AWS_REGION || 'ap-south-1';
  return `https://${getBucketName()}.s3.${region}.amazonaws.com/${key}`;
}

const handleFiles: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'files') {
    return false;
  }

  // POST /api/files/upload-url
  if (context.method === 'POST' && context.segments.length === 2 && context.segments[1] === 'upload-url') {
    const body = getRequestBody(req);
    const fileName = getString(body.fileName);
    const fileType = getString(body.fileType);
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : undefined;

    if (!fileName || !fileType) {
      return json(res, 400, { error: 'fileName and fileType are required' });
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return json(res, 400, { error: 'File size exceeds maximum limit of 10MB' });
    }

    try {
      // Generate unique file key
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = fileName.split('.').pop() || '';
      const key = `uploads/${timestamp}-${randomString}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        ContentType: fileType,
        CacheControl: 'max-age=31536000',
        Metadata: {
          originalFileName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Generate presigned URL valid for 15 minutes
      const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 900 });

      return json(res, 200, {
        uploadUrl,
        key,
        fileUrl: getPublicFileUrl(key),
      });
    } catch (error) {
      console.error('Generate upload URL error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  // POST /api/files/upload - Server-side upload to avoid CORS
  if (context.method === 'POST' && context.segments.length === 2 && context.segments[1] === 'upload') {
    try {
      // Get file from request body (can be base64 or FormData)
      const body = req.body;
      
      // Handle base64 encoded file
      if (body.file && body.fileName && body.fileType) {
        const fileData = body.file;
        const fileName = getString(body.fileName);
        const fileType = getString(body.fileType);
        
        // Validate file size (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        
        // Decode base64 if needed
        let fileBuffer: Buffer;
        if (typeof fileData === 'string') {
          // Remove data URL prefix if present
          const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          fileBuffer = Buffer.from(base64Data, 'base64');
        } else {
          return json(res, 400, { error: 'Invalid file data format' });
        }
        
        if (fileBuffer.length > MAX_FILE_SIZE) {
          return json(res, 400, { error: 'File size exceeds maximum limit of 10MB' });
        }
        
        // Generate unique file key
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = fileName.split('.').pop() || 'jpg';
        const key = `uploads/${timestamp}-${randomString}.${fileExtension}`;
        
        // Upload to S3
        const command = new PutObjectCommand({
          Bucket: getBucketName(),
          Key: key,
          Body: fileBuffer,
          ContentType: fileType,
          CacheControl: 'max-age=31536000',
          Metadata: {
            originalFileName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        });
        
        await getS3Client().send(command);
        
        return json(res, 200, {
          key,
          fileUrl: getPublicFileUrl(key),
        });
      } else {
        return json(res, 400, { error: 'file, fileName, and fileType are required' });
      }
    } catch (error) {
      console.error('Upload file error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  // GET /api/files/:key?expiresIn=3600
  if (context.method === 'GET' && context.segments.length === 2) {
    const key = decodeURIComponent(context.segments[1]);
    const expiresIn = req.query.expiresIn ? parseInt(getString(req.query.expiresIn) || '3600', 10) : 3600;

    try {
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      const url = await getSignedUrl(getS3Client(), command, { expiresIn });
      return json(res, 200, { url });
    } catch (error) {
      console.error('Get file URL error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  // DELETE /api/files/:key
  if (context.method === 'DELETE' && context.segments.length === 2) {
    const key = decodeURIComponent(context.segments[1]);

    try {
      const command = new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      await getS3Client().send(command);
      return json(res, 200, { success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete file error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  return false;
};

// Helper function to parse mentions from message text
function parseMentions(message: string, allUsers: Array<{ id: string; name: string }>): string[] {
  const mentions: string[] = [];
  const mentionRegex = /@([\w\s]+?)(?=\s|$|@|,|\.|!|\?)/g;
  let match;
  
  while ((match = mentionRegex.exec(message)) !== null) {
    const mentionedName = match[1].trim().toLowerCase();
    if (!mentionedName) continue;
    
    let user = allUsers.find(u => u.name.toLowerCase() === mentionedName);
    if (!user) {
      user = allUsers.find(u => {
        const firstName = u.name.split(' ')[0].toLowerCase();
        return firstName === mentionedName;
      });
    }
    if (!user) {
      user = allUsers.find(u => 
        u.name.toLowerCase().includes(mentionedName) || 
        mentionedName.includes(u.name.toLowerCase().split(' ')[0])
      );
    }
    if (user) {
      mentions.push(user.id);
    }
  }
  
  return [...new Set(mentions)];
}

const handleChats: ApiHandler = async (req, res, context) => {
  if (context.segments[0] !== 'chats') {
    return false;
  }

  const GROUP_CHAT_ID = 'group-chat-all';
  const chatsCollection = await getCollection<ChatDocument>('chats');
  const chatMessagesCollection = await getCollection<ChatMessageDocument>('chatMessages');
  const usersCollection = await getCollection<UserDocument>('users');

  // GET /api/chats?userId=xxx
  if (context.method === 'GET' && context.segments.length === 1) {
    const userId = getString(req.query.userId);
    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return json(res, 404, { error: 'User not found' });
    }

    // Get or create group chat
    let groupChat = await chatsCollection.findOne({ id: GROUP_CHAT_ID });
    if (!groupChat) {
      const allUsers = await usersCollection.find({}).toArray();
      const participantIds = allUsers.map(u => u.id);
      groupChat = {
        id: GROUP_CHAT_ID,
        type: 'group',
        participantIds,
        createdAt: new Date().toISOString(),
      };
      await chatsCollection.insertOne(groupChat);
    } else if (!groupChat.participantIds.includes(userId)) {
      await chatsCollection.updateOne(
        { id: GROUP_CHAT_ID },
        { $addToSet: { participantIds: userId } }
      );
      groupChat.participantIds.push(userId);
    }

    // Get last message
    const lastMessage = await chatMessagesCollection
      .find({ chatId: GROUP_CHAT_ID })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    // Get unread count
    const unreadCount = await chatMessagesCollection.countDocuments({
      chatId: GROUP_CHAT_ID,
      readBy: { $ne: userId },
      senderId: { $ne: userId },
    });

    const enriched: any = {
      id: groupChat.id,
      name: groupChat.name,
      participantIds: groupChat.participantIds,
      lastMessageAt: groupChat.lastMessageAt || null,
      createdAt: groupChat.createdAt,
      unreadCount,
      participantCount: groupChat.participantIds.length,
    };

    if (lastMessage.length > 0) {
      const msg = lastMessage[0];
      const sender = await usersCollection.findOne({ id: msg.senderId });
      enriched.lastMessage = {
        id: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        message: msg.message,
        attachments: msg.attachments || [],
        mentions: msg.mentions || [],
        readBy: msg.readBy || [],
        replyTo: msg.replyTo,
        createdAt: msg.createdAt,
        sender: sender ? { id: sender.id, name: sender.name, role: sender.role } : undefined,
      };
    }

    return json(res, 200, [enriched]);
  }

  // GET /api/chats/:chatId/messages?limit=xxx
  if (context.method === 'GET' && context.segments.length === 3 && context.segments[2] === 'messages') {
    const chatId = context.segments[1];
    const limit = parseInt(getString(req.query.limit) || '50', 10);
    const before = getString(req.query.before);

    let query: any = { chatId };
    if (before) {
      query.createdAt = { $lt: before };
    }

    const messages = await chatMessagesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    messages.reverse();

    // Enrich with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const sender = await usersCollection.findOne({ id: msg.senderId });
        return {
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          message: msg.message,
          attachments: msg.attachments || [],
          mentions: msg.mentions || [],
          readBy: msg.readBy || [],
          replyTo: msg.replyTo,
          createdAt: msg.createdAt,
          sender: sender ? { id: sender.id, name: sender.name, role: sender.role } : undefined,
        };
      })
    );

    return json(res, 200, enrichedMessages);
  }

  // POST /api/chats/:chatId/messages
  if (context.method === 'POST' && context.segments.length === 3 && context.segments[2] === 'messages') {
    const chatId = context.segments[1];
    const body = getRequestBody(req);
    const senderId = getString(body.senderId);
    const message = getString(body.message);
    const attachments = body.attachments as FileAttachment[] | undefined;
    const replyTo = body.replyTo as ChatMessageDocument['replyTo'] | undefined;

    if (!senderId) {
      return json(res, 400, { error: 'senderId is required' });
    }

    if (!message && (!attachments || attachments.length === 0)) {
      return json(res, 400, { error: 'message or attachments are required' });
    }

    const chat = await chatsCollection.findOne({ id: chatId });
    if (!chat) {
      return json(res, 404, { error: 'Chat not found' });
    }

    if (!chat.participantIds.includes(senderId)) {
      return json(res, 403, { error: 'User is not a participant in this chat' });
    }

    // Parse mentions
    const allUsers = await usersCollection.find({}).toArray();
    let mentions: string[] = [];
    if (message) {
      mentions = parseMentions(message, allUsers.map(u => ({ id: u.id, name: u.name })));
    }

    const newMessage: ChatMessageDocument = {
      id: uuidv4(),
      chatId,
      senderId,
      message: message ? message.trim() : '',
      attachments: attachments || [],
      mentions: mentions.length > 0 ? mentions : undefined,
      readBy: [senderId],
      replyTo: replyTo || undefined,
      createdAt: new Date().toISOString(),
    };

    await chatMessagesCollection.insertOne(newMessage);
    await chatsCollection.updateOne(
      { id: chatId },
      { $set: { lastMessageAt: new Date().toISOString() } }
    );

    const sender = await usersCollection.findOne({ id: senderId });
    const formattedMessage: any = {
      id: newMessage.id,
      chatId: newMessage.chatId,
      senderId: newMessage.senderId,
      message: newMessage.message,
      attachments: newMessage.attachments || [],
      mentions: newMessage.mentions || [],
      readBy: newMessage.readBy || [],
      replyTo: newMessage.replyTo,
      createdAt: newMessage.createdAt,
      sender: sender ? { id: sender.id, name: sender.name, role: sender.role } : undefined,
    };

    // Send push notifications (simplified - no WebSocket broadcast in Vercel)
    if (sender) {
      const otherParticipants = chat.participantIds.filter(id => id !== senderId);
      const notificationTitle = `${sender.name} in group chat`;
      const notificationBody = message && message.length > 100 ? message.substring(0, 100) + '...' : (message || 'Sent an attachment');
      
      for (const participantId of otherParticipants) {
        if (mentions.includes(participantId)) {
          await sendPushNotificationToUser(participantId, `@${sender.name} mentioned you`, notificationBody, {
            type: 'chat',
            chatId,
            messageId: newMessage.id,
          }, 'chat').catch(console.error);
        } else {
          await sendPushNotificationToUser(participantId, notificationTitle, notificationBody, {
            type: 'chat',
            chatId,
            messageId: newMessage.id,
          }, 'chat').catch(console.error);
        }
      }
    }

    return json(res, 200, formattedMessage);
  }

  // DELETE /api/chats/:chatId/messages
  if (context.method === 'DELETE' && context.segments.length === 3 && context.segments[2] === 'messages') {
    const chatId = context.segments[1];
    await chatMessagesCollection.deleteMany({ chatId });
    return json(res, 200, { success: true, deletedCount: 0 });
  }

  // PUT /api/chats/messages/:messageId/read
  if (context.method === 'PUT' && context.segments.length === 4 && context.segments[1] === 'messages' && context.segments[3] === 'read') {
    const messageId = context.segments[2];
    const body = getRequestBody(req);
    const userId = getString(body.userId);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    const message = await chatMessagesCollection.findOne({ id: messageId });
    if (!message) {
      return json(res, 404, { error: 'Message not found' });
    }

    const readBy = message.readBy || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await chatMessagesCollection.updateOne(
        { id: messageId },
        { $set: { readBy } }
      );
    }

    return json(res, 200, { success: true });
  }

  // GET /api/chats/unread-count?userId=xxx
  if (context.method === 'GET' && context.segments.length === 2 && context.segments[1] === 'unread-count') {
    const userId = getString(req.query.userId);
    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    const count = await chatMessagesCollection.countDocuments({
      chatId: GROUP_CHAT_ID,
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    });

    return json(res, 200, { unreadCount: count });
  }

  // PUT /api/chats/:chatId/name
  if (context.method === 'PUT' && context.segments.length === 3 && context.segments[2] === 'name') {
    const chatId = context.segments[1];
    const body = getRequestBody(req);
    const name = getString(body.name);
    const userId = getString(body.userId);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    if (!name || name.trim().length === 0) {
      return json(res, 400, { error: 'name is required' });
    }

    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return json(res, 404, { error: 'User not found' });
    }

    const chat = await chatsCollection.findOne({ id: chatId });
    if (!chat) {
      return json(res, 404, { error: 'Chat not found' });
    }

    if (!chat.participantIds.includes(userId)) {
      return json(res, 403, { error: 'User is not a participant in this chat' });
    }

    await chatsCollection.updateOne(
      { id: chatId },
      { $set: { name: name.trim() } }
    );

    const updatedChat = await chatsCollection.findOne({ id: chatId });
    if (!updatedChat) {
      return json(res, 404, { error: 'Chat not found after update' });
    }

    return json(res, 200, {
      id: updatedChat.id,
      name: updatedChat.name,
      participantIds: updatedChat.participantIds,
      lastMessageAt: updatedChat.lastMessageAt || null,
      createdAt: updatedChat.createdAt,
    });
  }

  return false;
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
  handleFCM,
  handleNotifications,
  handleLatePermissions,
  handleLateApprovals,
  handleChats,
  handleFiles,
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize Firebase on first request (for serverless functions)
  if (!firebaseAdmin) {
    initializeFirebase();
  }

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
