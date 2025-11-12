import { useEffect, useRef } from 'react';
import { getWebSocketUrl } from '@/lib/config';

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

interface DataUpdatePayload {
  dataType: string;
  data: unknown;
}

export function useWebSocket(
  userId: string | null,
  onDataUpdate: (dataType: string, data: unknown) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const connect = () => {
      try {
        // In development, connect directly to backend WebSocket
        // In production on Vercel, WebSocket is not supported via serverless functions
        // For now, skip WebSocket in production (real-time updates will work via polling/refresh)
        let wsUrl: string;
        if (import.meta.env.DEV) {
          // Development: connect directly to backend
          wsUrl = `ws://localhost:3000?userId=${userId}`;
        } else {
          const wsUrlFromEnv = getWebSocketUrl(userId);
          // If no WebSocket URL is configured, skip WebSocket (Vercel serverless doesn't support WS)
          if (!wsUrlFromEnv || wsUrlFromEnv === '') {
            console.log('⚠️  WebSocket not configured for production. Real-time updates disabled.');
            return;
          }
          wsUrl = wsUrlFromEnv;
        }
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          reconnectAttempts.current = 0;
          
          // Send ping to keep connection alive
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            } else {
              clearInterval(pingInterval);
            }
          }, 30000); // Ping every 30 seconds
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            if (message.type === 'pong') {
              // Heartbeat response
              return;
            }
            
            if (message.type === 'chat-message') {
              // Chat messages are sent directly, not wrapped in data-update
              console.log('📡 Chat message received');
              onDataUpdate('chat-message', message.payload);
            } else if (message.type === 'data-update') {
              const payload = message.payload as DataUpdatePayload;
              console.log('📡 Data update received:', payload.dataType);
              onDataUpdate(payload.dataType, payload.data);
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('❌ WebSocket disconnected');
          wsRef.current = null;
          
          // Attempt to reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error('❌ Max reconnection attempts reached');
          }
        };
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userId, onDataUpdate]);
}

