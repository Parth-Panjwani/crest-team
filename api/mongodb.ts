import { MongoClient, Db, Collection, Binary, ObjectId, WithId } from 'mongodb';
import { deflateSync, inflateSync } from 'zlib';
import { createHash } from 'crypto';

export type Role = 'admin' | 'employee' | (string & {});

export type AttendancePunchType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';

export interface AttendancePunch {
  at: string;
  type: AttendancePunchType;
  manualPunch?: boolean;
  punchedBy?: string;
  reason?: string;
}

export interface AttendanceTotals {
  workMin: number;
  breakMin: number;
}

export interface UserDocument {
  _id?: ObjectId;
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseSalary?: number | null;
}

export interface AttendanceDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  punches: AttendancePunch[] | string;
  totals: AttendanceTotals | string;
}

export interface NoteDocument {
  _id?: ObjectId;
  id: string;
  text?: string;
  textCompressed?: Binary | Buffer;
  textLength?: number;
  textHash?: string;
  createdBy: string;
  createdAt: string;
  status: string;
  category?: string;
  subCategory?: 'refill-stock' | 'remove-from-stock' | 'out-of-stock'; // Only for reminder category
  adminOnly?: boolean;
  completedBy?: string;
  completedAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface LeaveDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  type: string;
  reason?: string;
  status: string;
}

export interface SalaryDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  month: string;
  type?: string;
  base?: number;
  hours?: number;
  calcPay?: number;
  adjustments?: number;
  advances?: unknown[] | string;
  storePurchases?: unknown[] | string;
  totalDeductions?: number;
  finalPay?: number;
  paid?: number | boolean;
  paidDate?: string | null;
  note?: string | null;
}

export interface SalaryHistoryDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  oldBaseSalary: number | null;
  newBaseSalary: number;
  changedBy: string;
  reason?: string;
}

export interface PendingAdvanceDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  amount: number;
  description?: string;
  deducted?: boolean;
  deductedInSalaryId?: string;
  createdAt: string;
}

export interface PendingStorePurchaseDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  amount: number;
  description?: string;
  deducted?: boolean;
  deductedInSalaryId?: string;
  createdAt: string;
}

export interface AnnouncementDocument {
  _id?: ObjectId;
  id: string;
  title: string;
  body?: string;
  message?: string;
  createdAt: string;
  expiresAt?: string | null;
  readBy?: string[];
}

export interface NotificationDocument {
  _id?: ObjectId;
  id: string;
  type: 'punch' | 'leave' | 'note' | 'salary' | 'announcement' | 'chat';
  title: string;
  message: string;
  userId?: string;
  targetUserId?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface FormattedUser {
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseSalary?: number | null;
  fcmToken?: string;
}

export interface FormattedAttendance {
  id: string;
  userId: string;
  date: string;
  punches: AttendancePunch[];
  totals: AttendanceTotals;
}

export interface FormattedNote {
  id: string;
  text: string;
  createdBy: string;
  createdAt: Date;
  status: string;
  category?: string;
  subCategory?: 'refill-stock' | 'remove-from-stock' | 'out-of-stock';
  adminOnly: boolean;
  completedBy?: string;
  completedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: string | null;
}

export interface FormattedLeave {
  id: string;
  userId: string;
  date: string;
  type: string;
  reason?: string;
  status: string;
}

export interface FormattedSalary {
  id: string;
  userId: string;
  month: string;
  type?: string;
  base?: number;
  hours?: number;
  calcPay?: number;
  adjustments?: number;
  advances: unknown[];
  storePurchases: unknown[];
  totalDeductions: number;
  finalPay?: number;
  paid: number | boolean | undefined;
  paidDate?: string | null;
  note?: string | null;
}

export interface FormattedAnnouncement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  expiresAt: string | null;
  readBy: string[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorProperty<T>(error: unknown, key: string): T | undefined {
  if (isObjectRecord(error) && key in error) {
    return (error as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

// MongoDB connection
let client: MongoClient | null = null;
let db: Db | null = null;

// Get MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://theparthpanjwani_db_user:ttU8dSAeMrmR4Jsq@employee.aqhw6uk.mongodb.net/';
const DB_NAME = process.env.MONGODB_DB_NAME || 'crest-team';

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    // Add connection options for better SSL/TLS handling
    const clientOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      retryReads: true,
    };
    
    client = new MongoClient(MONGODB_URI, clientOptions);
    await client.connect();
    
    db = client.db(DB_NAME);
    
    // Ensure all collections exist
    await ensureCollections(db);
    
    // Create indexes for better performance
    await createIndexes(db);
    
    // Initialize with default data if empty
    await initializeDefaultData(db);

    // Ensure note documents use the compressed representation
    await ensureCompressedNotes(db);

    return db;
  } catch (error: unknown) {
    const message = readErrorProperty<string>(error, 'message') ?? 'Unknown error';
    const code = readErrorProperty<string | number>(error, 'code');
    const name = readErrorProperty<string>(error, 'name');

    console.error('❌ Failed to connect to MongoDB:', message);
    if (code !== undefined) {
      console.error('Error code:', code);
    }
    if (name) {
      console.error('Error name:', name);
    }

    const messageLower = message.toLowerCase();
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to MongoDB server. Check your connection string and network access.');
    }
    if (code === 8000 || messageLower.includes('authentication')) {
      throw new Error('MongoDB authentication failed. Check your credentials.');
    }
    if (
      messageLower.includes('ssl') ||
      messageLower.includes('tls') ||
      code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
    ) {
      throw new Error(
        'MongoDB SSL connection failed. Check: 1) Your IP is whitelisted in MongoDB Atlas, 2) Network firewall allows MongoDB connections, 3) Try again in a few moments.'
      );
    }
    if (messageLower.includes('replicasetnoprimary')) {
      throw new Error('MongoDB replica set issue. The cluster may be initializing. Please try again in a few moments.');
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

async function createIndexes(db: Db) {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ pin: 1 }, { unique: true, sparse: true }).catch(() => {});
    await db.collection('users').createIndex({ id: 1 }, { unique: true, sparse: true }).catch(() => {});
    
    // Attendance collection indexes
    await db.collection('attendance').createIndex({ userId: 1, date: 1 }, { unique: true, sparse: true }).catch(() => {});
    
    // Notes collection indexes
    await db.collection('notes').createIndex({ createdBy: 1 }).catch(() => {});
    await db.collection('notes').createIndex({ deleted: 1 }).catch(() => {});
    await db.collection('notes').createIndex({ textHash: 1 }, { unique: false }).catch(() => {});
    
    // Leaves collection indexes
    await db.collection('leaves').createIndex({ userId: 1 }).catch(() => {});
    
    // Salaries collection indexes
    await db.collection('salaries').createIndex({ userId: 1, month: 1 }, { unique: true, sparse: true }).catch(() => {});
    
    // Salary history indexes
    await db.collection('salaryHistory').createIndex({ userId: 1 }).catch(() => {});
    
    // Pending advances indexes
    await db.collection('pendingAdvances').createIndex({ userId: 1 }).catch(() => {});
    
    // Pending store purchases indexes
    await db.collection('pendingStorePurchases').createIndex({ userId: 1 }).catch(() => {});
    
    // Announcements collection indexes
    await db.collection('announcements').createIndex({ createdAt: -1 }).catch(() => {});
    
    console.log('✅ Indexes created/verified');
  } catch (error: unknown) {
    const message = readErrorProperty<string>(error, 'message') ?? 'Unknown error';
    console.error('Error creating indexes:', message);
    // Don't throw - indexes are optional
  }
}

// Ensure all collections exist by creating them
async function ensureCollections(db: Db) {
  const collections = [
    'users',
    'attendance',
    'notes',
    'leaves',
    'salaries',
    'salaryHistory',
    'pendingAdvances',
    'pendingStorePurchases',
    'announcements'
  ];
  
  const existingCollections = (await db.listCollections().toArray()).map(c => c.name);
  
  for (const collectionName of collections) {
    if (!existingCollections.includes(collectionName)) {
      // Create collection by inserting and deleting a dummy document
      await db.collection(collectionName).insertOne({ _temp: true });
      await db.collection(collectionName).deleteOne({ _temp: true });
    }
  }
}

async function initializeDefaultData(db: Db) {
  const usersCollection = db.collection('users');
  const userCount = await usersCollection.countDocuments();
  
  if (userCount === 0) {
    await usersCollection.insertMany([
      {
        id: '1',
        name: 'Store Owner',
        role: 'admin',
        pin: '1234',
        baseSalary: null,
      },
      {
        id: '2',
        name: 'Alice Johnson',
        role: 'employee',
        pin: '5678',
        baseSalary: 30000,
      },
      {
        id: '3',
        name: 'Bob Smith',
        role: 'employee',
        pin: '9012',
        baseSalary: 35000,
      },
    ]);
  }
}

function isBinary(value: unknown): value is Binary | Buffer {
  if (Buffer.isBuffer(value)) {
    return true;
  }

  if (isObjectRecord(value) && 'buffer' in value) {
    const bufferCandidate = (value as { buffer: unknown }).buffer;
    return Buffer.isBuffer(bufferCandidate);
  }

  return false;
}

function normalizeBinary(value: Binary | Buffer): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  return Buffer.from(value.buffer);
}

const NOTE_COMPRESSION_MIN_LENGTH = 16;

export function compressNoteText(text: string): { textCompressed: Binary; textLength: number; textHash: string } {
  const trimmed = text.trim();
  const buffer = Buffer.from(trimmed, 'utf8');

  const compressedBuffer =
    buffer.length > NOTE_COMPRESSION_MIN_LENGTH ? deflateSync(buffer) : buffer;

  return {
    textCompressed: new Binary(compressedBuffer),
    textLength: buffer.length,
    textHash: createHash('sha256').update(buffer).digest('base64url'),
  };
}

export function decompressNoteText(doc: Pick<NoteDocument, 'textCompressed' | 'text'>): string {
  if (doc?.textCompressed && isBinary(doc.textCompressed)) {
    const payload = normalizeBinary(doc.textCompressed);
    try {
      return inflateSync(payload).toString('utf8');
    } catch {
      return payload.toString('utf8');
    }
  }

  if (typeof doc?.text === 'string') {
    return doc.text;
  }

  return '';
}

async function ensureCompressedNotes(db: Db) {
  const notesCollection = db.collection<NoteDocument>('notes');
  const legacyNotes = await notesCollection
    .find<Pick<NoteDocument, '_id' | 'text'>>(
      { textCompressed: { $exists: false }, text: { $type: 'string' } },
      { projection: { _id: 1, text: 1 } }
    )
    .limit(250)
    .toArray();

  if (legacyNotes.length === 0) {
    return;
  }

  const bulk = notesCollection.initializeUnorderedBulkOp();
  for (const note of legacyNotes) {
    const text = typeof note.text === 'string' ? note.text : '';
    const { textCompressed, textLength, textHash } = compressNoteText(text);
    bulk
      .find({ _id: note._id })
      .updateOne({
        $set: { textCompressed, textLength, textHash },
        $unset: { text: '' },
      });
  }

  await bulk.execute();
}

export async function getCollection<T>(name: string): Promise<Collection<T>> {
  const database = await connectToDatabase();
  return database.collection<T>(name);
}

export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

// Helper to convert MongoDB document to app format
export function formatUser(doc: UserDocument | WithId<UserDocument>): FormattedUser {
  return {
    id: doc.id || (doc as WithId<UserDocument>)._id?.toString(),
    name: doc.name,
    role: doc.role,
    pin: doc.pin,
    baseSalary: doc.baseSalary ?? undefined,
    fcmToken: (doc as any).fcmToken ?? undefined,
  };
}

function parseAttendancePunches(input: AttendanceDocument['punches']): AttendancePunch[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed as AttendancePunch[];
      }
    } catch {
      // ignore malformed payloads
    }
  }

  return [];
}

function parseAttendanceTotals(input: AttendanceDocument['totals']): AttendanceTotals {
  if (
    typeof input === 'object' &&
    input !== null &&
    'workMin' in input &&
    'breakMin' in input
  ) {
    return input as AttendanceTotals;
  }

  if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'workMin' in parsed &&
        'breakMin' in parsed
      ) {
        return parsed as AttendanceTotals;
      }
    } catch {
      // ignore malformed payloads
    }
  }

  return { workMin: 0, breakMin: 0 };
}

export function formatAttendance(doc: AttendanceDocument | WithId<AttendanceDocument>): FormattedAttendance {
  return {
    id: doc.id || (doc as WithId<AttendanceDocument>)._id?.toString(),
    userId: doc.userId,
    date: doc.date,
    punches: parseAttendancePunches(doc.punches),
    totals: parseAttendanceTotals(doc.totals),
  };
}

export function formatNote(doc: NoteDocument | WithId<NoteDocument>): FormattedNote {
  return {
    id: doc.id || (doc as WithId<NoteDocument>)._id?.toString(),
    text: decompressNoteText(doc),
    createdBy: doc.createdBy,
    createdAt: new Date(doc.createdAt),
    status: doc.status,
    category: doc.category,
    subCategory: doc.subCategory,
    adminOnly: doc.adminOnly ?? false,
    completedBy: doc.completedBy,
    completedAt: doc.completedAt ? new Date(doc.completedAt) : undefined,
    deleted: doc.deleted ?? false,
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined,
    deletedBy: doc.deletedBy,
  };
}

export function formatLeave(doc: LeaveDocument | WithId<LeaveDocument>): FormattedLeave {
  return {
    id: doc.id || (doc as WithId<LeaveDocument>)._id?.toString(),
    userId: doc.userId,
    date: doc.date,
    type: doc.type,
    reason: doc.reason,
    status: doc.status,
  };
}

function parseArrayField(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore malformed payloads
    }
  }

  return [];
}

export function formatSalary(doc: SalaryDocument | WithId<SalaryDocument>): FormattedSalary {
  return {
    id: doc.id || (doc as WithId<SalaryDocument>)._id?.toString(),
    userId: doc.userId,
    month: doc.month,
    type: doc.type,
    base: doc.base,
    hours: doc.hours,
    calcPay: doc.calcPay,
    adjustments: doc.adjustments,
    advances: parseArrayField(doc.advances),
    storePurchases: parseArrayField(doc.storePurchases),
    totalDeductions: doc.totalDeductions ?? 0,
    finalPay: doc.finalPay,
    paid: doc.paid,
    paidDate: doc.paidDate,
    note: doc.note,
  };
}

export function formatAnnouncement(doc: AnnouncementDocument | WithId<AnnouncementDocument>): FormattedAnnouncement {
  const body = typeof doc.body === 'string' ? doc.body : typeof doc.message === 'string' ? doc.message : '';
  return {
    id: doc.id || (doc as WithId<AnnouncementDocument>)._id?.toString(),
    title: doc.title,
    body,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt ?? null,
    readBy: Array.isArray(doc.readBy) ? doc.readBy : [],
  };
}

