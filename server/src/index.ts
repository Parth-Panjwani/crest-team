import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './websocket/index.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

