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

export interface SalaryHistory {
  id: string;
  userId: string;
  date: string;
  oldBaseSalary: number | null;
  newBaseSalary: number;
  changedBy: string;
  reason?: string;
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

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  expiresAt?: Date;
  readBy: string[];
}

// Simple in-memory store with localStorage persistence
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

  constructor() {
    this.loadFromStorage();
    this.initializeMockData();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('emp-management-data');
      if (data) {
        const parsed = JSON.parse(data);
        this.users = parsed.users || [];
        this.attendance = parsed.attendance || [];
        this.notes = (parsed.notes || []).map((note: any) => ({
          ...note,
          category: note.category || 'general',
          adminOnly: note.adminOnly || false,
        }));
        this.leaves = parsed.leaves || [];
        // Handle backward compatibility for salaries
        this.salaries = (parsed.salaries || []).map((salary: any) => ({
          ...salary,
          advances: salary.advances || [],
          storePurchases: salary.storePurchases || [],
          totalDeductions: salary.totalDeductions || 0,
          // Recalculate finalPay if needed
          finalPay: salary.finalPay !== undefined ? salary.finalPay : 
            (salary.calcPay || 0) + (salary.adjustments || 0) - (salary.totalDeductions || 0),
        }));
        this.announcements = parsed.announcements || [];
        this.salaryHistory = parsed.salaryHistory || [];
        this.pendingAdvances = parsed.pendingAdvances || [];
        this.pendingStorePurchases = parsed.pendingStorePurchases || [];
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('emp-management-data', JSON.stringify({
        users: this.users,
        attendance: this.attendance,
        notes: this.notes,
        leaves: this.leaves,
        salaries: this.salaries,
        announcements: this.announcements,
        salaryHistory: this.salaryHistory,
        pendingAdvances: this.pendingAdvances,
        pendingStorePurchases: this.pendingStorePurchases,
      }));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  private initializeMockData() {
    if (this.users.length === 0) {
      this.users = [
        { id: '1', name: 'Store Owner', role: 'admin', pin: '1234' },
        { id: '2', name: 'Alice Johnson', role: 'employee', pin: '5678', baseSalary: 30000 },
        { id: '3', name: 'Bob Smith', role: 'employee', pin: '9012', baseSalary: 35000 },
      ];
      this.saveToStorage();
    }
  }

  // Auth
  login(pin: string): User | null {
    // Reload from storage to ensure we have the latest data
    this.loadFromStorage();
    const user = this.users.find(u => u.pin === pin);
    if (user) {
      this.currentUser = user;
      localStorage.setItem('current-user-id', user.id);
    }
    return user || null;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('current-user-id');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    const userId = localStorage.getItem('current-user-id');
    if (userId) {
      this.currentUser = this.users.find(u => u.id === userId) || null;
    }
    return this.currentUser;
  }

  // Users
  getAllUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  createUser(name: string, role: Role, pin: string, baseSalary?: number): User {
    const user: User = {
      id: Date.now().toString(),
      name,
      role,
      pin,
      baseSalary
    };
    this.users.push(user);
    this.saveToStorage();
    return user;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id'>>, reason?: string): User | null {
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
      }
      
      Object.assign(user, updates);
      // If updating the current user, also update the currentUser reference
      if (this.currentUser?.id === id) {
        this.currentUser = user;
      }
      this.saveToStorage();
      return user;
    }
    return null;
  }

  deleteUser(id: string): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index >= 0) {
      // Prevent deleting the current user
      if (this.currentUser?.id === id) {
        return false;
      }
      this.users.splice(index, 1);
      // Also clean up related data
      this.attendance = this.attendance.filter(a => a.userId !== id);
      this.leaves = this.leaves.filter(l => l.userId !== id);
      this.salaries = this.salaries.filter(s => s.userId !== id);
      this.salaryHistory = this.salaryHistory.filter(sh => sh.userId !== id);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getSalaryHistory(userId: string): SalaryHistory[] {
    return this.salaryHistory
      .filter(sh => sh.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Attendance
  getTodayAttendance(userId: string): Attendance | null {
    const today = new Date().toISOString().split('T')[0];
    return this.attendance.find(a => a.userId === userId && a.date === today) || null;
  }

  punch(userId: string, type: Punch['type']) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user has an open attendance from a previous day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
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
        // Auto-checkout at midnight (end of previous day)
        const midnight = new Date(yesterdayStr);
        midnight.setHours(23, 59, 59, 999);
        yesterdayAtt.punches.push({ at: midnight, type: 'OUT' });
        this.calculateTotals(yesterdayAtt);
      }
    }
    
    let att = this.attendance.find(a => a.userId === userId && a.date === today);
    
    if (!att) {
      att = {
        id: Date.now().toString(),
        userId,
        date: today,
        punches: [],
        totals: { workMin: 0, breakMin: 0 }
      };
      this.attendance.push(att);
    }

    att.punches.push({ at: new Date(), type });
    this.calculateTotals(att);
    this.saveToStorage();
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

    // If still checked in, calculate current work time
    if (lastIn) {
      workMin += (Date.now() - lastIn.getTime()) / 60000;
    }

    att.totals = { workMin: Math.round(workMin), breakMin: Math.round(breakMin) };
  }

  getAttendanceHistory(userId: string, limit = 30): Attendance[] {
    return this.attendance
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  getAllAttendance(): Attendance[] {
    return this.attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Notes
  addNote(text: string, userId: string, category: 'order' | 'general' | 'reminder' = 'general', adminOnly: boolean = false): Note {
    const note: Note = {
      id: Date.now().toString(),
      text,
      createdBy: userId,
      createdAt: new Date(),
      status: 'pending',
      category,
      adminOnly
    };
    this.notes.push(note);
    this.saveToStorage();
    return note;
  }

  updateNote(id: string, updates: Partial<Note>) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      this.saveToStorage();
    }
  }

  deleteNote(id: string, deletedBy?: string) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.deleted = true;
      note.deletedAt = new Date();
      note.deletedBy = deletedBy;
      this.saveToStorage();
    }
  }

  restoreNote(id: string) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.deleted = false;
      note.deletedAt = undefined;
      note.deletedBy = undefined;
      this.saveToStorage();
    }
  }

  permanentDeleteNote(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveToStorage();
  }

  getNotes(status?: 'pending' | 'done', showAdminOnly: boolean = false, currentUserId?: string): Note[] {
    let filtered = this.notes.filter(n => !n.deleted); // Exclude deleted notes
    if (status) {
      filtered = filtered.filter(n => n.status === status);
    }
    // Filter admin-only notes based on user role and showAdminOnly flag
    const currentUser = currentUserId ? this.users.find(u => u.id === currentUserId) : null;
    if (currentUser?.role !== 'admin' || !showAdminOnly) {
      filtered = filtered.filter(n => !n.adminOnly);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getDeletedNotes(userId?: string): Note[] {
    let filtered = this.notes.filter(n => n.deleted);
    
    // If userId provided, show only notes created by that user or deleted by that user
    // If admin (no userId filter), show all deleted notes
    if (userId) {
      const user = this.users.find(u => u.id === userId);
      if (user?.role !== 'admin') {
        // Regular users see only their own deleted notes
        filtered = filtered.filter(n => n.createdBy === userId || n.deletedBy === userId);
      }
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Leave
  applyLeave(userId: string, date: string, type: 'full' | 'half', reason: string): Leave {
    const leave: Leave = {
      id: Date.now().toString(),
      userId,
      date,
      type,
      reason,
      status: 'pending'
    };
    this.leaves.push(leave);
    this.saveToStorage();
    return leave;
  }

  updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
    const leave = this.leaves.find(l => l.id === id);
    if (leave) {
      leave.status = status;
      this.saveToStorage();
    }
  }

  getUserLeaves(userId: string): Leave[] {
    return this.leaves
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getPendingLeaves(): Leave[] {
    return this.leaves.filter(l => l.status === 'pending');
  }

  // Salary
  getSalary(userId: string, month: string): Salary | null {
    return this.salaries.find(s => s.userId === userId && s.month === month) || null;
  }

  updateSalary(salary: Salary) {
    // Calculate total deductions
    const advances = salary.advances || [];
    const storePurchases = salary.storePurchases || [];
    const totalDeductions = advances.reduce((sum, a) => sum + (a.amount || 0), 0) +
                           storePurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate final pay (after deductions)
    const finalPay = salary.calcPay + (salary.adjustments || 0) - totalDeductions;
    
    const updatedSalary: Salary = {
      ...salary,
      advances,
      storePurchases,
      totalDeductions,
      finalPay,
    };
    
    const index = this.salaries.findIndex(s => s.id === salary.id);
    if (index >= 0) {
      this.salaries[index] = updatedSalary;
    } else {
      this.salaries.push(updatedSalary);
    }
    this.saveToStorage();
  }

  getSalariesForMonth(month: string): Salary[] {
    return this.salaries.filter(s => s.month === month);
  }

  getAllSalaries(): Salary[] {
    return this.salaries.sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month);
      if (monthCompare !== 0) return monthCompare;
      return b.finalPay - a.finalPay;
    });
  }

  deleteSalary(id: string) {
    this.salaries = this.salaries.filter(s => s.id !== id);
    this.saveToStorage();
  }

  // Pending Advances
  addPendingAdvance(userId: string, date: string, amount: number, description: string): PendingAdvance {
    const advance: PendingAdvance = {
      id: Date.now().toString(),
      userId,
      date,
      amount,
      description,
      deducted: false,
      createdAt: new Date().toISOString(),
    };
    this.pendingAdvances.push(advance);
    this.saveToStorage();
    return advance;
  }

  getPendingAdvances(userId?: string): PendingAdvance[] {
    let filtered = this.pendingAdvances.filter(a => !a.deducted);
    if (userId) {
      filtered = filtered.filter(a => a.userId === userId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markAdvanceAsDeducted(advanceId: string, salaryId: string) {
    const advance = this.pendingAdvances.find(a => a.id === advanceId);
    if (advance) {
      advance.deducted = true;
      advance.deductedInSalaryId = salaryId;
      this.saveToStorage();
    }
  }

  deletePendingAdvance(id: string) {
    this.pendingAdvances = this.pendingAdvances.filter(a => a.id !== id);
    this.saveToStorage();
  }

  // Pending Store Purchases
  addPendingStorePurchase(userId: string, date: string, amount: number, description: string): PendingStorePurchase {
    const purchase: PendingStorePurchase = {
      id: Date.now().toString(),
      userId,
      date,
      amount,
      description,
      deducted: false,
      createdAt: new Date().toISOString(),
    };
    this.pendingStorePurchases.push(purchase);
    this.saveToStorage();
    return purchase;
  }

  getPendingStorePurchases(userId?: string): PendingStorePurchase[] {
    let filtered = this.pendingStorePurchases.filter(p => !p.deducted);
    if (userId) {
      filtered = filtered.filter(p => p.userId === userId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markStorePurchaseAsDeducted(purchaseId: string, salaryId: string) {
    const purchase = this.pendingStorePurchases.find(p => p.id === purchaseId);
    if (purchase) {
      purchase.deducted = true;
      purchase.deductedInSalaryId = salaryId;
      this.saveToStorage();
    }
  }

  deletePendingStorePurchase(id: string) {
    this.pendingStorePurchases = this.pendingStorePurchases.filter(p => p.id !== id);
    this.saveToStorage();
  }

  // Announcements
  addAnnouncement(title: string, body: string): Announcement {
    const announcement: Announcement = {
      id: Date.now().toString(),
      title,
      body,
      createdAt: new Date(),
      readBy: []
    };
    this.announcements.push(announcement);
    this.saveToStorage();
    return announcement;
  }

  markAnnouncementRead(id: string, userId: string) {
    const announcement = this.announcements.find(a => a.id === id);
    if (announcement && !announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId);
      this.saveToStorage();
    }
  }

  getActiveAnnouncements(): Announcement[] {
    const now = new Date();
    return this.announcements.filter(a => !a.expiresAt || new Date(a.expiresAt) > now);
  }

  clearAllData() {
    this.users = [];
    this.attendance = [];
    this.notes = [];
    this.leaves = [];
    this.salaries = [];
    this.announcements = [];
    this.currentUser = null;
    localStorage.clear();
    this.initializeMockData();
  }
}

export const store = new Store();
