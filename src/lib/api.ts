import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    this.socket = io(API_URL, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Listen for real-time updates
    this.socket.on('attendance:updated', (data) => {
      this.emit('attendance:updated', data);
    });

    this.socket.on('user:created', (data) => {
      this.emit('user:created', data);
    });

    this.socket.on('user:updated', (data) => {
      this.emit('user:updated', data);
    });

    this.socket.on('user:deleted', (data) => {
      this.emit('user:deleted', data);
    });

    this.socket.on('note:created', (data) => {
      this.emit('note:created', data);
    });

    this.socket.on('note:updated', (data) => {
      this.emit('note:updated', data);
    });

    this.socket.on('note:deleted', (data) => {
      this.emit('note:deleted', data);
    });

    this.socket.on('leave:created', (data) => {
      this.emit('leave:created', data);
    });

    this.socket.on('leave:updated', (data) => {
      this.emit('leave:updated', data);
    });

    this.socket.on('salary:updated', (data) => {
      this.emit('salary:updated', data);
    });

    this.socket.on('salary:deleted', (data) => {
      this.emit('salary:deleted', data);
    });

    this.socket.on('announcement:created', (data) => {
      this.emit('announcement:created', data);
    });

    this.socket.on('announcement:updated', (data) => {
      this.emit('announcement:updated', data);
    });
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const api = new ApiClient();

