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
}

export interface Leave {
  id: string;
  userId: string;
  date: string;
  type: 'full' | 'half';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
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
  finalPay: number;
  paid: boolean;
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
        this.salaries = parsed.salaries || [];
        this.announcements = parsed.announcements || [];
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

  updateUser(id: string, updates: Partial<Omit<User, 'id'>>): User | null {
    const user = this.users.find(u => u.id === id);
    if (user) {
      Object.assign(user, updates);
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
      this.saveToStorage();
      return true;
    }
    return false;
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

  deleteNote(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveToStorage();
  }

  getNotes(status?: 'pending' | 'done', showAdminOnly: boolean = false, currentUserId?: string): Note[] {
    let filtered = this.notes;
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
    const index = this.salaries.findIndex(s => s.id === salary.id);
    if (index >= 0) {
      this.salaries[index] = salary;
    } else {
      this.salaries.push(salary);
    }
    this.saveToStorage();
  }

  getSalariesForMonth(month: string): Salary[] {
    return this.salaries.filter(s => s.month === month);
  }

  deleteSalary(id: string) {
    this.salaries = this.salaries.filter(s => s.id !== id);
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
