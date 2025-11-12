import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://theparthpanjwani_db_user:ttU8dSAeMrmR4Jsq@employee.aqhw6uk.mongodb.net/';
const DB_NAME = 'crest-team';

async function initializeMongoDB() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!\n');
    
    const db = client.db(DB_NAME);
    
    // Collections that should exist
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
    
    console.log('📊 Creating collections and indexes...');
    console.log('='.repeat(50));
    
    // Create collections and indexes
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      
      // Create collection by inserting and deleting a dummy document
      const existing = await collection.countDocuments();
      if (existing === 0) {
        await collection.insertOne({ _temp: true });
        await collection.deleteOne({ _temp: true });
        console.log(`✅ Created collection: ${collectionName}`);
      } else {
        console.log(`ℹ️  Collection already exists: ${collectionName} (${existing} documents)`);
      }
    }
    
    // Create indexes
    console.log('\n📑 Creating indexes...');
    
    // Users indexes
    await db.collection('users').createIndex({ pin: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ id: 1 }, { unique: true, sparse: true });
    console.log('✅ Created indexes for users');
    
    // Attendance indexes
    await db.collection('attendance').createIndex({ userId: 1, date: 1 }, { unique: true, sparse: true });
    console.log('✅ Created indexes for attendance');
    
    // Notes indexes
    await db.collection('notes').createIndex({ createdBy: 1 });
    await db.collection('notes').createIndex({ deleted: 1 });
    console.log('✅ Created indexes for notes');
    
    // Leaves indexes
    await db.collection('leaves').createIndex({ userId: 1 });
    console.log('✅ Created indexes for leaves');
    
    // Salaries indexes
    await db.collection('salaries').createIndex({ userId: 1, month: 1 }, { unique: true, sparse: true });
    console.log('✅ Created indexes for salaries');
    
    // Salary history indexes
    await db.collection('salaryHistory').createIndex({ userId: 1 });
    console.log('✅ Created indexes for salaryHistory');
    
    // Pending advances indexes
    await db.collection('pendingAdvances').createIndex({ userId: 1 });
    console.log('✅ Created indexes for pendingAdvances');
    
    // Pending store purchases indexes
    await db.collection('pendingStorePurchases').createIndex({ userId: 1 });
    console.log('✅ Created indexes for pendingStorePurchases');
    
    // Announcements indexes
    await db.collection('announcements').createIndex({ createdAt: -1 });
    console.log('✅ Created indexes for announcements');
    
    // Initialize default users if empty
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    
    if (userCount === 0) {
      console.log('\n👤 Creating default users...');
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
      console.log('✅ Created 3 default users');
    } else {
      console.log(`\nℹ️  Users already exist: ${userCount} users`);
    }
    
    // Show final status
    console.log('\n' + '='.repeat(50));
    console.log('📊 Final Database Status:');
    console.log('='.repeat(50));
    
    const allCollections = await db.listCollections().toArray();
    for (const coll of allCollections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  ${coll.name}: ${count} documents`);
    }
    
    console.log('\n✅ MongoDB initialization complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('💡 Duplicate key error - some indexes may already exist');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Connection closed.');
    }
  }
}

initializeMongoDB();

