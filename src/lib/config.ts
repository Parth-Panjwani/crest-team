// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

// Helper to get API URL
export function getApiUrl(endpoint: string): string {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

// Helper to get WebSocket URL
export function getWebSocketUrl(userId?: string): string {
  const base = WS_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  return userId ? `${base}?userId=${userId}` : base;
}

