import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connectDB } from './config/database.js';
import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './websocket/index.js';
import { initializeFirebase } from './config/firebase.js';

// Load .env file - explicitly from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

console.log(`🔍 Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Failed to load .env file:', result.error.message);
  // Try current working directory as fallback
  dotenv.config({ path: join(process.cwd(), '.env') });
} else {
  console.log('✅ .env file loaded successfully');
}

// Debug: Show if S3_BUCKET_NAME was loaded
if (process.env.S3_BUCKET_NAME) {
  console.log(`✅ S3_BUCKET_NAME loaded: ${process.env.S3_BUCKET_NAME}`);
} else {
  console.warn('⚠️  S3_BUCKET_NAME not found in environment variables');
}

// Initialize Firebase Admin SDK
console.log('🔧 Initializing Firebase Admin SDK...');
initializeFirebase();

// Debug: Show if Firebase credentials were loaded
if (process.env.FIREBASE_PROJECT_ID) {
  console.log(`✅ FIREBASE_PROJECT_ID loaded: ${process.env.FIREBASE_PROJECT_ID}`);
} else {
  console.warn('⚠️  FIREBASE_PROJECT_ID not found in environment variables');
}
if (process.env.FIREBASE_CLIENT_EMAIL) {
  console.log(`✅ FIREBASE_CLIENT_EMAIL loaded: ${process.env.FIREBASE_CLIENT_EMAIL}`);
} else {
  console.warn('⚠️  FIREBASE_CLIENT_EMAIL not found in environment variables');
}
if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log(`✅ FIREBASE_PRIVATE_KEY loaded: ${process.env.FIREBASE_PRIVATE_KEY.substring(0, 20)}...`);
} else {
  console.warn('⚠️  FIREBASE_PRIVATE_KEY not found in environment variables');
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://crest-team.vercel.app',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [])
];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, be more permissive
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  CORS: Allowing origin ${origin} (development mode)`);
        callback(null, true);
      } else {
        console.error(`❌ CORS: Blocked origin ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup routes
setupRoutes(app);

// Setup WebSocket for real-time sync
setupWebSocket(wss);

// Connect to MongoDB
connectDB().then(() => {
  console.log('✅ MongoDB connected');
  
  // Start HTTP server (WebSocket is already attached)
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  process.exit(1);
});

export { app, server, wss };

