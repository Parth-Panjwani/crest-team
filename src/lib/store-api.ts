// API-based store with real-time updates
import { api } from './api';
import type { User, Attendance, Note, Leave, Salary, Announcement, Punch } from './store';

class ApiStore {
  private currentUser: User | null = null;
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.setupRealtimeListeners();
  }

  private setupRealtimeListeners() {
    // Listen for attendance updates
    api.on('attendance:updated', (data) => {
      this.notify('attendance');
    });

    // Listen for user updates
    api.on('user:created', () => this.notify('users'));
    api.on('user:updated', () => this.notify('users'));
    api.on('user:deleted', () => this.notify('users'));

    // Listen for note updates
    api.on('note:created', () => this.notify('notes'));
    api.on('note:updated', () => this.notify('notes'));
    api.on('note:deleted', () => this.notify('notes'));

    // Listen for leave updates
    api.on('leave:created', () => this.notify('leaves'));
    api.on('leave:updated', () => this.notify('leaves'));

    // Listen for salary updates
    api.on('salary:updated', () => this.notify('salaries'));
    api.on('salary:deleted', () => this.notify('salaries'));

    // Listen for announcement updates
    api.on('announcement:created', () => this.notify('announcements'));
    api.on('announcement:updated', () => this.notify('announcements'));
  }

  private notify(event: string) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener());
    }
  }

  on(event: string, callback: () => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Auth
  async login(pin: string): Promise<User | null> {
    try {
      const user = await api.post('/api/auth/login', { pin });
      this.currentUser = user;
      if (user) {
        localStorage.setItem('current-user-id', user.id);
      }
      return user;
    } catch {
      return null;
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('current-user-id');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    const userId = localStorage.getItem('current-user-id');
    if (userId) {
      // Try to get user from API
      api.get(`/api/users/${userId}`).then(user => {
        this.currentUser = user;
      }).catch(() => {
        localStorage.removeItem('current-user-id');
      });
    }
    return this.currentUser;
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    return api.get('/api/users');
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await api.get(`/api/users/${id}`);
    } catch {
      return null;
    }
  }

  async createUser(name: string, role: 'admin' | 'employee', pin: string, baseSalary?: number): Promise<User> {
    return api.post('/api/users', { name, role, pin, baseSalary });
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User | null> {
    try {
      return await api.put(`/api/users/${id}`, updates);
    } catch {
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await api.delete(`/api/users/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  // Attendance
  async getTodayAttendance(userId: string): Promise<Attendance | null> {
    try {
      const data = await api.get(`/api/attendance/today/${userId}`);
      if (!data) return null;
      return {
        ...data,
        punches: data.punches.map((p: any) => ({
          ...p,
          at: new Date(p.at)
        }))
      };
    } catch {
      return null;
    }
  }

  async punch(userId: string, type: Punch['type']): Promise<void> {
    await api.post('/api/attendance/punch', { userId, type });
  }

  async getAttendanceHistory(userId: string, limit = 30): Promise<Attendance[]> {
    try {
      const data = await api.get(`/api/attendance/history/${userId}?limit=${limit}`);
      return data.map((att: any) => ({
        ...att,
        punches: att.punches.map((p: any) => ({
          ...p,
          at: new Date(p.at)
        }))
      }));
    } catch {
      return [];
    }
  }

  async getAllAttendance(): Promise<Attendance[]> {
    try {
      const data = await api.get('/api/attendance/all');
      return data.map((att: any) => ({
        ...att,
        punches: att.punches.map((p: any) => ({
          ...p,
          at: new Date(p.at)
        }))
      }));
    } catch {
      return [];
    }
  }

  // Notes
  async addNote(text: string, userId: string, category: 'order' | 'general' | 'reminder' = 'general', adminOnly = false): Promise<Note> {
    const data = await api.post('/api/notes', { text, createdBy: userId, category, adminOnly });
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      readBy: data.readBy || []
    };
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    await api.put(`/api/notes/${id}`, updates);
  }

  async deleteNote(id: string): Promise<void> {
    await api.delete(`/api/notes/${id}`);
  }

  async getNotes(status?: 'pending' | 'done', showAdminOnly = false, currentUserId?: string): Promise<Note[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('showAdminOnly', showAdminOnly.toString());
    if (currentUserId) params.append('currentUserId', currentUserId);
    
    const data = await api.get(`/api/notes?${params.toString()}`);
    return data.map((note: any) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      expiresAt: note.expiresAt ? new Date(note.expiresAt) : undefined,
      readBy: note.readBy || [],
      adminOnly: Boolean(note.adminOnly)
    }));
  }

  // Leave
  async applyLeave(userId: string, date: string, type: 'full' | 'half', reason: string): Promise<Leave> {
    return api.post('/api/leaves', { userId, date, type, reason });
  }

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    await api.put(`/api/leaves/${id}`, { status });
  }

  async getUserLeaves(userId: string): Promise<Leave[]> {
    const data = await api.get(`/api/leaves?userId=${userId}`);
    return data;
  }

  async getPendingLeaves(): Promise<Leave[]> {
    const data = await api.get('/api/leaves');
    return data.filter((l: Leave) => l.status === 'pending');
  }

  // Salary
  async getSalary(userId: string, month: string): Promise<Salary | null> {
    try {
      const data = await api.get(`/api/salaries?userId=${userId}&month=${month}`);
      return data[0] || null;
    } catch {
      return null;
    }
  }

  async updateSalary(salary: Salary): Promise<void> {
    await api.post('/api/salaries', salary);
  }

  async getSalariesForMonth(month: string): Promise<Salary[]> {
    return api.get(`/api/salaries?month=${month}`);
  }

  async deleteSalary(id: string): Promise<void> {
    await api.delete(`/api/salaries/${id}`);
  }

  // Announcements
  async addAnnouncement(title: string, body: string): Promise<Announcement> {
    const data = await api.post('/api/announcements', { title, body });
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      readBy: data.readBy || []
    };
  }

  async markAnnouncementRead(id: string, userId: string): Promise<void> {
    await api.put(`/api/announcements/${id}/read`, { userId });
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const data = await api.get('/api/announcements');
    const now = new Date();
    return data
      .map((ann: any) => ({
        ...ann,
        createdAt: new Date(ann.createdAt),
        expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : undefined,
        readBy: ann.readBy || []
      }))
      .filter((ann: Announcement) => !ann.expiresAt || ann.expiresAt > now);
  }
}

export const store = new ApiStore();
export type { User, Attendance, Note, Leave, Salary, Announcement, Punch } from './store';

