// API client for Vercel serverless functions
// Uses polling for "real-time" updates since WebSockets aren't supported

const API_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : '';

class VercelApiClient {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private lastUpdateTimes: Map<string, number> = new Map();

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

  startPolling(endpoint: string, event: string, interval = 2000) {
    if (this.pollingIntervals.has(event)) {
      return; // Already polling
    }

    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          const lastUpdate = this.lastUpdateTimes.get(event) || 0;
          const currentTime = Date.now();
          
          // Only emit if data changed (simple check)
          if (currentTime - lastUpdate > interval) {
            this.lastUpdateTimes.set(event, currentTime);
            this.emit(event, data);
          }
        }
      } catch (error) {
        console.error(`Polling error for ${event}:`, error);
      }
    };

    // Poll immediately
    poll();
    
    // Then poll at interval
    const intervalId = setInterval(poll, interval);
    this.pollingIntervals.set(event, intervalId);
  }

  stopPolling(event: string) {
    const intervalId = this.pollingIntervals.get(event);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(event);
    }
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
    // Stop all polling
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
  }
}

export const api = new VercelApiClient();

