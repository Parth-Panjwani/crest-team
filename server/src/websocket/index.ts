import { WebSocketServer, WebSocket } from 'ws';
import { broadcast } from './broadcast.js';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  userId?: string;
}

const clients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    const userId = new URL(req.url || '', 'http://localhost').searchParams.get('userId');
    
    if (userId) {
      if (!clients.has(userId)) {
        clients.set(userId, new Set());
      }
      clients.get(userId)!.add(ws);
      console.log(`✅ WebSocket connected: ${userId} (Total: ${clients.size})`);
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        const userClients = clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            clients.delete(userId);
          }
        }
        console.log(`❌ WebSocket disconnected: ${userId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
}

function handleMessage(ws: WebSocket, message: WebSocketMessage) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
}

export function broadcastToUser(userId: string, message: WebSocketMessage) {
  const userClients = clients.get(userId);
  if (userClients) {
    const data = JSON.stringify(message);
    userClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

export function broadcastToAll(message: WebSocketMessage) {
  const data = JSON.stringify(message);
  clients.forEach((userClients) => {
    userClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
}

export { broadcast };

