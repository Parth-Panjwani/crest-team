import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'crest-team';

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    
    // Create indexes
    await createIndexes(db);
    
    console.log(`✅ Connected to database: ${dbName}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

async function createIndexes(db: Db) {
  try {
    // Users collection
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('users').createIndex({ pin: 1 }, { unique: true });
    
    // Attendance collection
    await db.collection('attendance').createIndex({ userId: 1, date: 1 }, { unique: true });
    
    // Notes collection
    await db.collection('notes').createIndex({ id: 1 }, { unique: true });
    await db.collection('notes').createIndex({ createdBy: 1 });
    await db.collection('notes').createIndex({ status: 1 });
    
    // Leaves collection
    await db.collection('leaves').createIndex({ id: 1 }, { unique: true });
    await db.collection('leaves').createIndex({ userId: 1 });
    await db.collection('leaves').createIndex({ status: 1 });
    
    // Salaries collection
    await db.collection('salaries').createIndex({ id: 1 }, { unique: true });
    await db.collection('salaries').createIndex({ userId: 1, month: 1 }, { unique: true });
    
    // Announcements collection
    await db.collection('announcements').createIndex({ id: 1 }, { unique: true });
    
    // Notifications collection
    await db.collection('notifications').createIndex({ id: 1 }, { unique: true });
    await db.collection('notifications').createIndex({ targetUserId: 1 });
    await db.collection('notifications').createIndex({ read: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });
    
    // Late permissions collection
    await db.collection('latePermissions').createIndex({ id: 1 }, { unique: true });
    await db.collection('latePermissions').createIndex({ userId: 1, date: 1 });
    await db.collection('latePermissions').createIndex({ status: 1 });
    
    // Late approvals collection
    await db.collection('lateApprovals').createIndex({ id: 1 }, { unique: true });
    await db.collection('lateApprovals').createIndex({ userId: 1 });
    await db.collection('lateApprovals').createIndex({ status: 1 });
    await db.collection('lateApprovals').createIndex({ date: -1 });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️ Error creating indexes:', error);
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ Database connection closed');
  }
}

