// Type definitions for app data
export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseSalary?: number;
}

export interface Punch {
  at: Date;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  punches: Punch[];
  totals: {
    workMin: number;
    breakMin: number;
  };
}

export interface Note {
  id: string;
  text: string;
  createdBy: string;
  createdAt: Date;
  status: 'pending' | 'done';
  category: 'order' | 'general' | 'reminder';
  adminOnly: boolean;
  completedBy?: string;
  completedAt?: Date;
  deleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface Leave {
  id: string;
  userId: string;
  date: string;
  type: 'full' | 'half';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Advance {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface StorePurchase {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface Salary {
  id: string;
  userId: string;
  month: string;
  type: 'fixed' | 'hourly';
  base: number;
  hours: number;
  calcPay: number;
  adjustments: number;
  advances: Advance[];
  storePurchases: StorePurchase[];
  totalDeductions: number;
  finalPay: number;
  paid: boolean;
  paidDate?: string;
  note?: string;
}

export interface SalaryHistory {
  id: string;
  userId: string;
  date: string;
  oldBaseSalary: number | null;
  newBaseSalary: number;
  changedBy: string;
  reason?: string;
}

export interface PendingAdvance {
  id: string;
  userId: string;
  date: string;
  amount: number;
  description: string;
  deducted: boolean;
  deductedInSalaryId?: string;
  createdAt: string;
}

export interface PendingStorePurchase {
  id: string;
  userId: string;
  date: string;
  amount: number;
  description: string;
  deducted: boolean;
  deductedInSalaryId?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  expiresAt?: Date;
  readBy: string[];
}

// MongoDB-driven store - all data comes from MongoDB
class Store {
  private users: User[] = [];
  private attendance: Attendance[] = [];
  private notes: Note[] = [];
  private leaves: Leave[] = [];
  private salaries: Salary[] = [];
  private announcements: Announcement[] = [];
  private salaryHistory: SalaryHistory[] = [];
  private pendingAdvances: PendingAdvance[] = [];
  private pendingStorePurchases: PendingStorePurchase[] = [];
  private currentUser: User | null = null;
  private dataLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    // Clear old localStorage data (except current-user-id for session)
    this.clearOldLocalStorageData();
    // Load all data from MongoDB on initialization
    this.loadAllDataFromMongoDB();
  }

  // Clear old localStorage data to prevent conflicts
  private clearOldLocalStorageData() {
    try {
      // Keep only current-user-id, remove all other localStorage data
      const currentUserId = localStorage.getItem('current-user-id');
      localStorage.clear();
      if (currentUserId) {
        localStorage.setItem('current-user-id', currentUserId);
      }
      console.log('Cleared old localStorage data (keeping session only)');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  // Load all data from MongoDB
  private async loadAllDataFromMongoDB(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
        const [users, notes, leaves, salaries, attendance, salaryHistory, pendingAdvances, pendingStorePurchases, announcements] = await Promise.all([
          fetch(`${apiBase}/api/users`).then(r => {
            if (!r.ok) {
              console.error(`Failed to fetch users: ${r.status} ${r.statusText}`);
              return [];
            }
            return r.json();
          }).catch(err => {
            console.error('Failed to load users:', err);
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
              console.error('⚠️ API not available. Run: npx vercel dev');
            }
            return [];
          }),
          fetch(`${apiBase}/api/notes?deleted=false`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/leaves`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/salaries`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/attendance/all`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/salaryHistory`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/pendingAdvances`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/pendingStorePurchases`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${apiBase}/api/announcements`).then(r => r.ok ? r.json() : []).catch(() => []),
        ]);

        // Update in-memory cache with MongoDB data
        this.users = users.map((u: any) => ({ ...u }));
        this.notes = notes.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          completedAt: n.completedAt ? new Date(n.completedAt) : undefined,
          deletedAt: n.deletedAt ? new Date(n.deletedAt) : undefined,
        }));
        this.leaves = leaves.map((l: any) => ({ ...l }));
        this.salaries = salaries.map((s: any) => ({
          ...s,
          advances: Array.isArray(s.advances) ? s.advances : [],
          storePurchases: Array.isArray(s.storePurchases) ? s.storePurchases : [],
          paid: Boolean(s.paid),
        }));
        this.attendance = attendance.map((a: any) => ({
          ...a,
          punches: Array.isArray(a.punches) ? a.punches.map((p: any) => ({
            ...p,
            at: new Date(p.at),
          })) : [],
          totals: typeof a.totals === 'object' ? a.totals : { workMin: 0, breakMin: 0 },
        }));
        this.salaryHistory = salaryHistory.map((sh: any) => ({ ...sh }));
        this.pendingAdvances = pendingAdvances.map((pa: any) => ({ ...pa }));
        this.pendingStorePurchases = pendingStorePurchases.map((psp: any) => ({ ...psp }));
        this.announcements = announcements.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          expiresAt: a.expiresAt ? new Date(a.expiresAt) : undefined,
          readBy: Array.isArray(a.readBy) ? a.readBy : [],
        }));

        // Restore current user from session
        const userId = localStorage.getItem('current-user-id');
        if (userId) {
          this.currentUser = this.users.find(u => u.id === userId) || null;
        }

        this.dataLoaded = true;
        console.log('All data loaded from MongoDB');
    } catch (error) {
        console.error('Failed to load data from MongoDB:', error);
        this.dataLoaded = false;
      }
    })();

    return this.loadingPromise;
  }

  // Ensure data is loaded before operations
  private async ensureDataLoaded(): Promise<void> {
    if (!this.dataLoaded) {
      await this.loadAllDataFromMongoDB();
    }
  }

  // Sync to MongoDB API
  private async syncToAPI(endpoint: string, method: string, data?: any): Promise<any> {
    try {
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${apiBase}/api/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`;
          }
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`Failed to sync to API (${endpoint}):`, error);
      throw error;
    }
  }

  // Refresh data from MongoDB
  async refreshData(): Promise<void> {
    this.dataLoaded = false;
    this.loadingPromise = null;
    await this.loadAllDataFromMongoDB();
  }

  // Auth - ALWAYS uses MongoDB, no localStorage fallback
  async login(pin: string): Promise<User | null> {
    try {
      // Ensure we have fresh data from MongoDB
      await this.refreshData();
      
      // Try login via API (MongoDB)
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      
      if (response.ok) {
        const user = await response.json();
      this.currentUser = user;
        // Only store user ID in localStorage for session management
      localStorage.setItem('current-user-id', user.id);
        // Refresh all data from MongoDB after login
        await this.refreshData();
        return user;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Invalid PIN' }));
        console.error('Login failed:', errorData.error);
        return null;
      }
    } catch (error: any) {
      console.error('API login failed:', error);
      // In local dev, if API is not available, show helpful error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        console.error('⚠️ MongoDB API not available. Make sure you are running on Vercel or have API proxy configured.');
        throw new Error('Cannot connect to database. Please check your connection.');
      }
      throw error;
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('current-user-id');
  }

  getCurrentUser(): User | null {
    // Synchronous - reads from memory after initial load
    if (this.currentUser) return this.currentUser;
    const userId = localStorage.getItem('current-user-id');
    if (userId && this.users.length > 0) {
      this.currentUser = this.users.find(u => u.id === userId) || null;
    }
    return this.currentUser;
  }

  // Users
  getAllUsers(): User[] {
    // Synchronous - reads from memory after initial load
    return this.users;
  }

  getUserById(id: string): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  async createUser(name: string, role: Role, pin: string, baseSalary?: number): Promise<User> {
    const user = await this.syncToAPI('users', 'POST', { name, role, pin, baseSalary });
    if (user) {
    this.users.push(user);
      await this.refreshData(); // Refresh to ensure consistency
    return user;
    }
    throw new Error('Failed to create user');
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>, reason?: string): Promise<User | null> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      // Track salary changes
      if (updates.baseSalary !== undefined && updates.baseSalary !== user.baseSalary) {
        const historyEntry: SalaryHistory = {
          id: Date.now().toString(),
          userId: id,
          date: new Date().toISOString(),
          oldBaseSalary: user.baseSalary || null,
          newBaseSalary: updates.baseSalary,
          changedBy: this.currentUser?.id || 'system',
          reason: reason,
        };
        this.salaryHistory.push(historyEntry);
        // Save salary history to MongoDB
        await this.syncToAPI('salaryHistory', 'POST', historyEntry);
      }
      
      Object.assign(user, updates);
      if (this.currentUser?.id === id) {
        this.currentUser = user;
      }
      
      const updated = await this.syncToAPI(`users/${id}`, 'PUT', { ...user, ...updates });
      if (updated) {
        Object.assign(user, updated);
      }
      
      await this.refreshData();
      return user;
    }
    return null;
  }

  async deleteUser(id: string): Promise<boolean> {
      if (this.currentUser?.id === id) {
        return false;
      }
    
    await this.syncToAPI(`users/${id}`, 'DELETE');
    await this.refreshData();
      return true;
    }

  getSalaryHistory(userId: string): SalaryHistory[] {
    return this.salaryHistory
      .filter(sh => sh.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Attendance
  getTodayAttendance(userId: string): Attendance | null {
    // Synchronous - reads from memory after initial load
    const today = new Date().toISOString().split('T')[0];
    return this.attendance.find(a => a.userId === userId && a.date === today) || null;
  }

  async punch(userId: string, type: Punch['type']) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user has an open attendance from a previous day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    await this.ensureDataLoaded();
    const yesterdayAtt = this.attendance.find(a => 
      a.userId === userId && 
      a.date === yesterdayStr &&
      a.punches.length > 0 &&
      a.punches[a.punches.length - 1].type !== 'OUT'
    );
    
    // If user was checked in from yesterday and checking in today, auto-checkout yesterday
    if (yesterdayAtt && type === 'IN') {
      const lastPunch = yesterdayAtt.punches[yesterdayAtt.punches.length - 1];
      if (lastPunch.type === 'IN' || lastPunch.type === 'BREAK_END') {
        const midnight = new Date(yesterdayStr);
        midnight.setHours(23, 59, 59, 999);
        yesterdayAtt.punches.push({ at: midnight, type: 'OUT' });
        this.calculateTotals(yesterdayAtt);
        await this.syncToAPI('attendance/punch', 'POST', { userId, type: 'OUT', date: yesterdayStr });
      }
    }
    
    // Sync punch to MongoDB
    const result = await this.syncToAPI('attendance/punch', 'POST', { userId, type });
    await this.refreshData();
    return result;
  }

  private calculateTotals(att: Attendance) {
    let workMin = 0;
    let breakMin = 0;
    let lastIn: Date | null = null;
    let lastBreakStart: Date | null = null;

    for (const punch of att.punches) {
      if (punch.type === 'IN') {
        lastIn = new Date(punch.at);
      } else if (punch.type === 'OUT' && lastIn) {
        workMin += (new Date(punch.at).getTime() - lastIn.getTime()) / 60000;
        lastIn = null;
      } else if (punch.type === 'BREAK_START' && lastIn) {
        workMin += (new Date(punch.at).getTime() - lastIn.getTime()) / 60000;
        lastBreakStart = new Date(punch.at);
        lastIn = null;
      } else if (punch.type === 'BREAK_END' && lastBreakStart) {
        breakMin += (new Date(punch.at).getTime() - lastBreakStart.getTime()) / 60000;
        lastIn = new Date(punch.at);
        lastBreakStart = null;
      }
    }

    if (lastIn) {
      workMin += (Date.now() - lastIn.getTime()) / 60000;
    }

    att.totals = { workMin: Math.round(workMin), breakMin: Math.round(breakMin) };
  }

  getAttendanceHistory(userId: string, limit = 30): Attendance[] {
    // Synchronous - reads from memory after initial load
    return this.attendance
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  getAllAttendance(): Attendance[] {
    // Synchronous - reads from memory after initial load
    return this.attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Notes
  async addNote(text: string, userId: string, category: 'order' | 'general' | 'reminder' = 'general', adminOnly: boolean = false): Promise<Note> {
    const note = await this.syncToAPI('notes', 'POST', { text, createdBy: userId, category, adminOnly });
    if (note) {
      await this.refreshData();
      return {
        ...note,
        createdAt: new Date(note.createdAt),
      };
    }
    throw new Error('Failed to create note');
  }

  async updateNote(id: string, updates: Partial<Note>) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      await this.syncToAPI(`notes/${id}`, 'PUT', updates);
      await this.refreshData();
    }
  }

  async deleteNote(id: string, deletedBy?: string) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      await this.syncToAPI(`notes/${id}`, 'DELETE', { deletedBy });
      await this.refreshData();
    }
  }

  async restoreNote(id: string) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.deleted = false;
      note.deletedAt = undefined;
      note.deletedBy = undefined;
      await this.syncToAPI(`notes/${id}/restore`, 'POST', {});
      await this.refreshData();
    }
  }

  async permanentDeleteNote(id: string) {
    await this.syncToAPI(`notes/${id}/permanent`, 'DELETE', {});
    await this.refreshData();
  }

  getNotes(status?: 'pending' | 'done', showAdminOnly: boolean = false, currentUserId?: string): Note[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.notes.filter(n => !n.deleted);
    if (status) {
      filtered = filtered.filter(n => n.status === status);
    }
    if (showAdminOnly === false && currentUserId) {
      filtered = filtered.filter(n => !n.adminOnly || n.createdBy === currentUserId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getDeletedNotes(userId?: string): Note[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.notes.filter(n => n.deleted);
    if (userId) {
      const user = this.getCurrentUser();
      if (user?.role !== 'admin') {
        filtered = filtered.filter(n => n.createdBy === userId);
      }
    }
    return filtered.sort((a, b) => {
      const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Leave
  async applyLeave(userId: string, date: string, type: 'full' | 'half', reason: string): Promise<Leave> {
    const leave = await this.syncToAPI('leaves', 'POST', { userId, date, type, reason });
    if (leave) {
      await this.refreshData();
    return leave;
    }
    throw new Error('Failed to create leave');
  }

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
    const leave = this.leaves.find(l => l.id === id);
    if (leave) {
      leave.status = status;
      await this.syncToAPI(`leaves/${id}`, 'PUT', { status });
      await this.refreshData();
    }
  }

  getUserLeaves(userId: string): Leave[] {
    // Synchronous - reads from memory after initial load
    return this.leaves
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getPendingLeaves(): Leave[] {
    // Synchronous - reads from memory after initial load
    return this.leaves.filter(l => l.status === 'pending');
  }

  // Salary
  getSalary(userId: string, month: string): Salary | null {
    // Synchronous - reads from memory after initial load
    return this.salaries.find(s => s.userId === userId && s.month === month) || null;
  }

  async updateSalary(salary: Salary) {
    const advances = salary.advances || [];
    const storePurchases = salary.storePurchases || [];
    const totalDeductions = advances.reduce((sum, a) => sum + (a.amount || 0), 0) +
                           storePurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const calcPay = salary.type === 'hourly' ? salary.base * salary.hours : salary.base;
    const finalPay = calcPay + (salary.adjustments || 0) - totalDeductions;
    
    const updatedSalary: Salary = {
      ...salary,
      calcPay,
      advances,
      storePurchases,
      totalDeductions,
      finalPay,
    };
    
    const synced = await this.syncToAPI('salaries', 'POST', updatedSalary);
    if (synced) {
      Object.assign(updatedSalary, synced);
    }
    
    await this.refreshData();
  }

  getSalariesForMonth(month: string): Salary[] {
    // Synchronous - reads from memory after initial load
    return this.salaries.filter(s => s.month === month);
  }

  getAllSalaries(): Salary[] {
    // Synchronous - reads from memory after initial load
    return this.salaries.sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month);
      if (monthCompare !== 0) return monthCompare;
      return b.finalPay - a.finalPay;
    });
  }

  async deleteSalary(id: string) {
    await this.syncToAPI(`salaries/${id}`, 'DELETE');
    await this.refreshData();
  }

  // Pending Advances
  async addPendingAdvance(userId: string, date: string, amount: number, description: string): Promise<PendingAdvance> {
    const advance = await this.syncToAPI('pendingAdvances', 'POST', { userId, date, amount, description });
    if (advance) {
      await this.refreshData();
      return advance;
    }
    throw new Error('Failed to create advance');
  }

  getPendingAdvances(userId?: string): PendingAdvance[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.pendingAdvances.filter(a => !a.deducted);
    if (userId) {
      filtered = filtered.filter(a => a.userId === userId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markAdvanceAsDeducted(advanceId: string, salaryId: string) {
    const advance = this.pendingAdvances.find(a => a.id === advanceId);
    if (advance) {
      advance.deducted = true;
      advance.deductedInSalaryId = salaryId;
      await this.syncToAPI(`pendingAdvances/${advanceId}`, 'PUT', { salaryId });
      await this.refreshData();
    }
  }

  async deletePendingAdvance(id: string) {
    await this.syncToAPI(`pendingAdvances/${id}`, 'DELETE');
    await this.refreshData();
  }

  // Pending Store Purchases
  async addPendingStorePurchase(userId: string, date: string, amount: number, description: string): Promise<PendingStorePurchase> {
    const purchase = await this.syncToAPI('pendingStorePurchases', 'POST', { userId, date, amount, description });
    if (purchase) {
      await this.refreshData();
      return purchase;
    }
    throw new Error('Failed to create store purchase');
  }

  getPendingStorePurchases(userId?: string): PendingStorePurchase[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.pendingStorePurchases.filter(p => !p.deducted);
    if (userId) {
      filtered = filtered.filter(p => p.userId === userId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markStorePurchaseAsDeducted(purchaseId: string, salaryId: string) {
    const purchase = this.pendingStorePurchases.find(p => p.id === purchaseId);
    if (purchase) {
      purchase.deducted = true;
      purchase.deductedInSalaryId = salaryId;
      await this.syncToAPI(`pendingStorePurchases/${purchaseId}`, 'PUT', { salaryId });
      await this.refreshData();
    }
  }

  async deletePendingStorePurchase(id: string) {
    await this.syncToAPI(`pendingStorePurchases/${id}`, 'DELETE');
    await this.refreshData();
  }

  // Announcements
  async addAnnouncement(title: string, body: string): Promise<Announcement> {
    const announcement = await this.syncToAPI('announcements', 'POST', { title, body });
    if (announcement) {
      await this.refreshData();
      return {
        ...announcement,
        createdAt: new Date(announcement.createdAt),
        expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : undefined,
      };
    }
    throw new Error('Failed to create announcement');
  }

  async markAnnouncementRead(id: string, userId: string) {
    const announcement = this.announcements.find(a => a.id === id);
    if (announcement && !announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId);
      await this.syncToAPI(`announcements/${id}/read`, 'PUT', { userId });
      await this.refreshData();
    }
  }

  getActiveAnnouncements(): Announcement[] {
    // Synchronous - reads from memory after initial load
    const now = new Date();
    return this.announcements.filter(
      (ann: Announcement) => !ann.expiresAt || ann.expiresAt > now
    );
  }

  async clearAllData() {
    // This should only be available to admin and should clear MongoDB
    // For now, just clear local cache and refresh
    this.users = [];
    this.attendance = [];
    this.notes = [];
    this.leaves = [];
    this.salaries = [];
    this.announcements = [];
    this.salaryHistory = [];
    this.pendingAdvances = [];
    this.pendingStorePurchases = [];
    localStorage.clear();
    await this.refreshData();
  }
}

export const store = new Store();
