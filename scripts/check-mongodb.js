import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://theparthpanjwani_db_user:ttU8dSAeMrmR4Jsq@employee.aqhw6uk.mongodb.net/';
const DB_NAME = 'crest-team';

async function checkMongoDB() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!\n');
    
    const db = client.db(DB_NAME);
    
    // List all collections
    console.log('📊 Collections in database:', DB_NAME);
    console.log('=' .repeat(50));
    
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found. Database is empty.');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`\n📁 ${collection.name}`);
        console.log(`   Documents: ${count}`);
        
        // Show sample document structure for each collection
        if (count > 0) {
          const sample = await db.collection(collection.name).findOne({});
          if (sample) {
            console.log(`   Sample fields: ${Object.keys(sample).join(', ')}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Total collections: ${collections.length}`);
    
    // Show detailed info for each collection
    if (collections.length > 0) {
      console.log('\n📋 Detailed Collection Information:');
      console.log('='.repeat(50));
      
      for (const collection of collections) {
        const coll = db.collection(collection.name);
        const count = await coll.countDocuments();
        
        console.log(`\n${collection.name}:`);
        console.log(`  - Total documents: ${count}`);
        
        if (count > 0) {
          // Get indexes
          const indexes = await coll.indexes();
          console.log(`  - Indexes: ${indexes.length}`);
          indexes.forEach(idx => {
            const keys = Object.keys(idx.key).join(', ');
            console.log(`    • ${keys}${idx.unique ? ' (unique)' : ''}`);
          });
          
          // Show first document structure
          const firstDoc = await coll.findOne({});
          if (firstDoc) {
            console.log(`  - Sample document structure:`);
            Object.keys(firstDoc).forEach(key => {
              const value = firstDoc[key];
              const type = Array.isArray(value) ? 'array' : typeof value;
              console.log(`    • ${key}: ${type}`);
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Check your MongoDB credentials and network access.');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Connection closed.');
    }
  }
}

checkMongoDB();

