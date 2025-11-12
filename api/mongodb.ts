import { MongoClient, Db, Collection } from 'mongodb';

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
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    // Ensure all collections exist
    await ensureCollections(db);
    
    // Create indexes for better performance
    await createIndexes(db);
    
    // Initialize with default data if empty
    await initializeDefaultData(db);
    
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function createIndexes(db: Db) {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ pin: 1 }, { unique: true });
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    
    // Attendance collection indexes
    await db.collection('attendance').createIndex({ userId: 1, date: 1 }, { unique: true });
    
    // Notes collection indexes
    await db.collection('notes').createIndex({ createdBy: 1 });
    await db.collection('notes').createIndex({ deleted: 1 });
    
    // Leaves collection indexes
    await db.collection('leaves').createIndex({ userId: 1 });
    
    // Salaries collection indexes
    await db.collection('salaries').createIndex({ userId: 1, month: 1 }, { unique: true });
    
    // Salary history indexes
    await db.collection('salaryHistory').createIndex({ userId: 1 });
    
    // Pending advances indexes
    await db.collection('pendingAdvances').createIndex({ userId: 1 });
    
    // Pending store purchases indexes
    await db.collection('pendingStorePurchases').createIndex({ userId: 1 });
    
    // Announcements collection indexes
    await db.collection('announcements').createIndex({ createdAt: -1 });
  } catch (error) {
    console.error('Error creating indexes:', error);
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
      console.log(`Created collection: ${collectionName}`);
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
export function formatUser(doc: any): any {
  return {
    id: doc.id || doc._id?.toString(),
    name: doc.name,
    role: doc.role,
    pin: doc.pin,
    baseSalary: doc.baseSalary || undefined,
  };
}

export function formatAttendance(doc: any): any {
  return {
    id: doc.id || doc._id?.toString(),
    userId: doc.userId,
    date: doc.date,
    punches: Array.isArray(doc.punches) ? doc.punches : JSON.parse(doc.punches || '[]'),
    totals: typeof doc.totals === 'object' ? doc.totals : JSON.parse(doc.totals || '{"workMin":0,"breakMin":0}'),
  };
}

export function formatNote(doc: any): any {
  return {
    id: doc.id || doc._id?.toString(),
    text: doc.text,
    createdBy: doc.createdBy,
    createdAt: new Date(doc.createdAt),
    status: doc.status,
    category: doc.category,
    adminOnly: doc.adminOnly || false,
    completedBy: doc.completedBy,
    completedAt: doc.completedAt ? new Date(doc.completedAt) : undefined,
    deleted: doc.deleted || false,
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined,
    deletedBy: doc.deletedBy,
  };
}

export function formatLeave(doc: any): any {
  return {
    id: doc.id || doc._id?.toString(),
    userId: doc.userId,
    date: doc.date,
    type: doc.type,
    reason: doc.reason,
    status: doc.status,
  };
}

export function formatSalary(doc: any): any {
  return {
    id: doc.id || doc._id?.toString(),
    userId: doc.userId,
    month: doc.month,
    type: doc.type,
    base: doc.base,
    hours: doc.hours,
    calcPay: doc.calcPay,
    adjustments: doc.adjustments,
    advances: Array.isArray(doc.advances) ? doc.advances : JSON.parse(doc.advances || '[]'),
    storePurchases: Array.isArray(doc.storePurchases) ? doc.storePurchases : JSON.parse(doc.storePurchases || '[]'),
    totalDeductions: doc.totalDeductions || 0,
    finalPay: doc.finalPay,
    paid: doc.paid || 0,
    paidDate: doc.paidDate,
    note: doc.note,
  };
}

