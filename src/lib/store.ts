// Type definitions for app data
export type Role = 'admin' | 'employee';

export interface CustomBreakTime {
  id: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  reason?: string; // e.g., "Side gig", "Personal break"
}

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
  baseSalary?: number | null;
  customBreakTimes?: CustomBreakTime[]; // Custom break times for this employee
}

export interface Punch {
  at: Date;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
  manualPunch?: boolean; // true if punched by admin
  punchedBy?: string; // admin user ID who did the manual punch
  reason?: string; // reason for manual punch or break
  status?: 'on-time' | 'late' | 'early' | 'overtime';
  statusMessage?: string;
  lateApprovalId?: string; // ID of late approval if this punch is late and needs approval
  lateApprovalStatus?: 'pending' | 'approved' | 'rejected'; // Status of late approval
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
  status?: {
    checkIn?: 'on-time' | 'late' | 'early';
    checkOut?: 'on-time' | 'early' | 'overtime';
  };
}

export interface Note {
  id: string
  text: string
  createdBy: string
  createdAt: Date
  status: "pending" | "done"
  category: "order" | "general" | "reminder"
  subCategory?: "refill-stock" | "remove-from-stock" | "out-of-stock" // Only for reminder category
  adminOnly: boolean
  completedBy?: string
  completedAt?: Date
  deleted?: boolean
  deletedAt?: Date
  deletedBy?: string
  imageUrl?: string
}

export interface FileAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  message: string
  attachments?: FileAttachment[]
  mentions?: string[]
  readBy?: string[]
  createdAt: string
  replyTo?: {
    messageId: string
    senderId: string
    senderName: string
    message: string
  }
  sender?: {
    id: string
    name: string
    role: string
  }
}

export interface Chat {
  id: string
  name?: string
  participantIds: string[]
  lastMessageAt?: string | null
  createdAt: string
  otherParticipant?: {
    id: string
    name: string
    role: string
  }
  lastMessage?: ChatMessage
  unreadCount?: number
}

export interface Leave {
  id: string
  userId: string
  date: string
  type: "full" | "half"
  reason: string
  status: "pending" | "approved" | "rejected"
  salaryDeduction?: boolean
  approvedBy?: string
  approvedAt?: string
}

export interface Advance {
  id: string
  date: string
  amount: number
  description: string
}

export interface StorePurchase {
  id: string
  date: string
  amount: number
  description: string
}

export interface Salary {
  id: string
  userId: string
  month: string
  type: "fixed" | "hourly"
  base: number
  hours: number
  calcPay: number
  adjustments: number
  advances: Advance[]
  storePurchases: StorePurchase[]
  totalDeductions: number
  finalPay: number
  paid: boolean
  paidDate?: string
  note?: string
}

export interface SalaryHistory {
  id: string
  userId: string
  date: string
  oldBaseSalary: number | null
  newBaseSalary: number
  changedBy: string
  reason?: string
}

export interface PendingAdvance {
  id: string
  userId: string
  date: string
  amount: number
  description: string
  deducted: boolean
  deductedInSalaryId?: string
  createdAt: string
}

export interface PendingStorePurchase {
  id: string
  userId: string
  date: string
  amount: number
  description: string
  deducted: boolean
  deductedInSalaryId?: string
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  createdAt: Date
  expiresAt?: Date
  readBy: string[]
}

export interface Notification {
  id: string
  type: "punch" | "leave" | "note" | "salary" | "announcement"
  title: string
  message: string
  userId?: string
  targetUserId?: string
  read: boolean
  createdAt: string
  data?: Record<string, unknown>
}

export interface LatePermission {
  id: string
  userId: string
  date: string
  requestedAt: string
  reason: string
  expectedArrivalTime?: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
}

export interface LateApproval {
  id: string
  userId: string
  attendanceId: string
  punchId: string
  date: string
  punchTime: string
  lateByMinutes: number
  hasPermission: boolean
  permissionId?: string
  status: "pending" | "approved" | "rejected"
  requestedAt: string
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  adminNotes?: string
}

type UnknownRecord = Record<string, unknown>

interface PunchPayload extends Omit<Punch, "at"> {
  at: string
}

interface AttendancePayload extends Omit<Attendance, "punches"> {
  punches: PunchPayload[]
}

interface NotePayload
  extends Omit<Note, "createdAt" | "completedAt" | "deletedAt"> {
  createdAt: string
  completedAt?: string | null
  deletedAt?: string | null
  subCategory?: "refill-stock" | "remove-from-stock" | "out-of-stock"
  imageUrl?: string
}

interface SalaryPayload
  extends Omit<Salary, "advances" | "storePurchases" | "paid"> {
  advances?: Advance[]
  storePurchases?: StorePurchase[]
  paid?: number | boolean
  paidDate?: string | null
}

interface AnnouncementPayload
  extends Omit<Announcement, "createdAt" | "expiresAt"> {
  createdAt: string
  expiresAt?: string | null
}

interface BootstrapResponse {
  users?: User[]
  notes?: NotePayload[]
  leaves?: Leave[]
  salaries?: SalaryPayload[]
  attendance?: AttendancePayload[]
  salaryHistory?: SalaryHistory[]
  pendingAdvances?: PendingAdvance[]
  pendingStorePurchases?: PendingStorePurchase[]
  announcements?: AnnouncementPayload[]
  chats?: Chat[]
  chatMessages?: ChatMessage[]
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null
}

function getErrorMessage(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error
  }
  if (isRecord(error) && typeof error.message === "string") {
    return error.message
  }
  return undefined
}

function getErrorName(error: unknown): string | undefined {
  if (isRecord(error) && typeof error.name === "string") {
    return error.name
  }
  return undefined
}

// Store timing configuration
export const STORE_TIMINGS = {
  morningStart: "09:30", // 9:30 AM
  morningEnd: "13:40", // 1:40 PM
  lunchStart: "13:40", // 1:40 PM
  lunchEnd: "15:30", // 3:30 PM
  eveningStart: "15:30", // 3:30 PM
  eveningEnd: "21:30", // 9:30 PM
}

// MongoDB-driven store - all data comes from MongoDB
class Store {
  private users: User[] = []
  private usersById: Map<string, User> = new Map()
  private attendance: Attendance[] = []
  private notes: Note[] = []
  private leaves: Leave[] = []
  private salaries: Salary[] = []
  private announcements: Announcement[] = []
  private salaryHistory: SalaryHistory[] = []
  private pendingAdvances: PendingAdvance[] = []
  private pendingStorePurchases: PendingStorePurchase[] = []
  private notifications: Notification[] = []
  private chats: Chat[] = []
  private chatMessages: ChatMessage[] = []
  private currentUser: User | null = null
  private dataLoaded: boolean = false
  private loadingPromise: Promise<void> | null = null
  private updateListeners: Set<() => void> = new Set()

  constructor() {
    // Clear old localStorage data (except current-user-id for session)
    this.clearOldLocalStorageData()
    // Load all data from MongoDB on initialization
    this.loadAllDataFromMongoDB().catch((error: unknown) => {
      console.error("Initial data load failed:", error)
    })
  }

  // Clear old localStorage data to prevent conflicts
  private clearOldLocalStorageData() {
    try {
      // Keep only current-user-id, remove all other localStorage data
      const currentUserId = localStorage.getItem("current-user-id")
      localStorage.clear()
      if (currentUserId) {
        localStorage.setItem("current-user-id", currentUserId)
      }
      console.log("Cleared old localStorage data (keeping session only)")
    } catch (error: unknown) {
      console.error("Failed to clear localStorage:", error)
    }
  }

  // Load all data from MongoDB
  private async loadAllDataFromMongoDB(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = (async () => {
      try {
        // In development, use relative URL to leverage Vite proxy
        // In production on Vercel, use relative URL (same origin)
        // Only use absolute URL if VITE_API_URL is explicitly set
        const apiBase = import.meta.env.VITE_API_URL || ""
        const bootstrapUrl = apiBase
          ? `${apiBase}/api/bootstrap`
          : "/api/bootstrap"
        const response = await fetch(bootstrapUrl)

        if (!response.ok) {
          throw new Error(
            `Bootstrap request failed: ${response.status} ${response.statusText}`
          )
        }

        const bootstrap = (await response.json()) as BootstrapResponse
        const usersPayload = bootstrap.users ?? []
        const notesPayload = bootstrap.notes ?? []
        const leavesPayload = bootstrap.leaves ?? []
        const salariesPayload = bootstrap.salaries ?? []
        const attendancePayload = bootstrap.attendance ?? []
        const salaryHistoryPayload = bootstrap.salaryHistory ?? []
        const pendingAdvancesPayload = bootstrap.pendingAdvances ?? []
        const pendingStorePurchasesPayload =
          bootstrap.pendingStorePurchases ?? []
        const announcementsPayload = bootstrap.announcements ?? []
        const chatsPayload = bootstrap.chats ?? []
        const chatMessagesPayload = bootstrap.chatMessages ?? []

        this.users = usersPayload.map((user) => ({ ...user }))
        this.users.sort((a, b) => a.name.localeCompare(b.name))
        this.notes = notesPayload.map((note) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          completedAt: note.completedAt
            ? new Date(note.completedAt)
            : undefined,
          deletedAt: note.deletedAt ? new Date(note.deletedAt) : undefined,
        }))
        this.notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        this.leaves = leavesPayload.map((leave) => ({ ...leave }))
        this.salaries = salariesPayload.map((salary) => ({
          ...salary,
          advances: Array.isArray(salary.advances) ? salary.advances : [],
          storePurchases: Array.isArray(salary.storePurchases)
            ? salary.storePurchases
            : [],
          paid: Boolean(salary.paid),
          paidDate: salary.paidDate ?? undefined,
        }))
        this.attendance = attendancePayload.map((record) => ({
          ...record,
          punches: Array.isArray(record.punches)
            ? record.punches.map((punch) => ({
                ...punch,
                at: new Date(punch.at),
              }))
            : [],
          totals: record.totals ?? { workMin: 0, breakMin: 0 },
        }))
        this.attendance.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        this.salaryHistory = salaryHistoryPayload.map((entry) => ({ ...entry }))
        this.pendingAdvances = pendingAdvancesPayload.map((entry) => ({
          ...entry,
        }))
        this.pendingAdvances.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        this.pendingStorePurchases = pendingStorePurchasesPayload.map(
          (entry) => ({ ...entry })
        )
        this.pendingStorePurchases.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        this.announcements = announcementsPayload.map((announcement) => ({
          ...announcement,
          body: announcement.body ?? "",
          createdAt: new Date(announcement.createdAt),
          expiresAt: announcement.expiresAt
            ? new Date(announcement.expiresAt)
            : undefined,
          readBy: Array.isArray(announcement.readBy) ? announcement.readBy : [],
        }))
        this.announcements.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )
        this.chats = chatsPayload.map((chat) => ({ ...chat }))
        this.chatMessages = chatMessagesPayload.map((msg) => ({ ...msg }))

        this.rebuildIndexes()

        const userId = localStorage.getItem("current-user-id")
        if (userId) {
          this.currentUser = this.usersById.get(userId) || null
        }

        this.dataLoaded = true
        console.log("All data loaded from MongoDB")
      } catch (error: unknown) {
        console.error("Failed to load data from MongoDB:", error)
        this.dataLoaded = false
        throw error
      } finally {
        this.loadingPromise = null
      }
    })()

    return this.loadingPromise
  }

  private rebuildIndexes() {
    this.usersById.clear()
    for (const user of this.users) {
      this.usersById.set(user.id, user)
    }
  }

  // Ensure data is loaded before operations
  private async ensureDataLoaded(): Promise<void> {
    if (!this.dataLoaded) {
      await this.loadAllDataFromMongoDB()
    }
  }

  // Sync to MongoDB API
  private async syncToAPI<TResponse = unknown>(
    endpoint: string,
    method: string,
    data?: Record<string, unknown>
  ): Promise<TResponse> {
    try {
      // In development, use relative URL to leverage Vite proxy
      // In production on Vercel, use relative URL (same origin)
      // Only use absolute URL if VITE_API_URL is explicitly set
      const apiBase = import.meta.env.VITE_API_URL || ""
      const apiUrl = apiBase ? `${apiBase}/api/${endpoint}` : `/api/${endpoint}`
      const response = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
        throw new Error(errorMessage)
      }

      return (await response.json()) as TResponse
    } catch (error: unknown) {
      console.error(`Failed to sync to API (${endpoint}):`, error)
      throw error instanceof Error
        ? error
        : new Error(getErrorMessage(error) ?? "Unknown API error")
    }
  }

  // Subscribe to store updates
  subscribe(listener: () => void): () => void {
    this.updateListeners.add(listener)
    return () => {
      this.updateListeners.delete(listener)
    }
  }

  // Notify all listeners of data changes
  private notifyListeners(): void {
    this.updateListeners.forEach((listener) => listener())
  }

  // Refresh data from MongoDB
  async refreshData(): Promise<void> {
    this.dataLoaded = false
    this.loadingPromise = null
    await this.loadAllDataFromMongoDB()
    this.notifyListeners()
  }

  // Auth - ALWAYS uses MongoDB, no localStorage fallback
  async login(pin: string): Promise<User | null> {
    // In development, use relative URL to leverage Vite proxy
    // In production on Vercel, use relative URL (same origin)
    // Only use absolute URL if VITE_API_URL is explicitly set
    const apiBase = import.meta.env.VITE_API_URL || ""
    const loginUrl = apiBase ? `${apiBase}/api/auth/login` : "/api/auth/login"
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      console.log("Making login request to:", loginUrl)

      // Try login via API (MongoDB) - don't refresh all data first, just login
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 401) {
          console.log("Invalid PIN - 401 response")
          return null // Invalid PIN
        }
        const errorText = await response.text()
        console.error("Login failed:", response.status, errorText)
        throw new Error(
          `Login failed: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`
        )
      }

      const user = (await response.json()) as User
      console.log("Login successful:", user.name)
      this.currentUser = user

      // Store user ID in localStorage for session management
      localStorage.setItem("current-user-id", user.id)

      // Refresh all data from MongoDB after login (don't await - do it in background)
      this.refreshData().catch((err: unknown) =>
        console.error("Background data refresh failed:", err)
      )

      return user
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      console.error("API login failed:", error)

      // Handle timeout
      if (getErrorName(error) === "AbortError") {
        throw new Error(
          'Request timeout - Backend server may not be running. Please run "npm run dev:server" in another terminal.'
        )
      }

      // In local dev, if API is not available, show helpful error
      const message = getErrorMessage(error) ?? ""
      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("ERR_CONNECTION_REFUSED")
      ) {
        throw new Error(
          'Backend server not running. Please run "npm run dev:server" or "npm run dev:all" to start both frontend and backend.'
        )
      }

      throw error instanceof Error
        ? error
        : new Error(message || "Login request failed")
    }
  }

  logout() {
    this.currentUser = null
    localStorage.removeItem("current-user-id")
  }

  getCurrentUser(): User | null {
    // Synchronous - reads from memory after initial load
    if (this.currentUser) return this.currentUser
    const userId = localStorage.getItem("current-user-id")
    if (userId && this.usersById.size > 0) {
      this.currentUser = this.usersById.get(userId) || null
    }
    return this.currentUser
  }

  // Users
  getAllUsers(): User[] {
    // Synchronous - reads from memory after initial load
    return this.users
  }

  getUserById(id: string): User | null {
    return this.usersById.get(id) || null
  }

  async createUser(
    name: string,
    role: Role,
    pin: string,
    baseSalary?: number
  ): Promise<User> {
    const user = await this.syncToAPI<User>("users", "POST", {
      name,
      role,
      pin,
      baseSalary,
    })
    if (user) {
      this.users.push(user)
      this.users.sort((a, b) => a.name.localeCompare(b.name))
      this.usersById.set(user.id, user)
      // Auto-refresh after CRUD operation
      await this.refreshData()
      return user
    }
    throw new Error("Failed to create user")
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, "id">>,
    reason?: string
  ): Promise<User | null> {
    const user = this.users.find((u) => u.id === id)
    if (user) {
      // Track salary changes
      if (
        updates.baseSalary !== undefined &&
        updates.baseSalary !== user.baseSalary
      ) {
        const historyEntry: SalaryHistory = {
          id: Date.now().toString(),
          userId: id,
          date: new Date().toISOString(),
          oldBaseSalary: user.baseSalary || null,
          newBaseSalary: updates.baseSalary,
          changedBy: this.currentUser?.id || "system",
          reason: reason,
        }
        this.salaryHistory.push(historyEntry)
        // Save salary history to MongoDB
        await this.syncToAPI(
          "salaryHistory",
          "POST",
          historyEntry as unknown as Record<string, unknown>
        )
      }

      Object.assign(user, updates)
      this.users.sort((a, b) => a.name.localeCompare(b.name))
      this.usersById.set(id, user)
      if (this.currentUser?.id === id) {
        this.currentUser = user
      }

      const updated = await this.syncToAPI<User>(`users/${id}`, "PUT", {
        ...user,
        ...updates,
      })
      if (updated) {
        Object.assign(user, updated)
        this.users.sort((a, b) => a.name.localeCompare(b.name))
        this.usersById.set(id, user)
      }

      // Auto-refresh after CRUD operation
      await this.refreshData()
      return user
    }
    return null
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.currentUser?.id === id) {
      return false
    }

    await this.syncToAPI(`users/${id}`, "DELETE")
    this.users = this.users.filter((u) => u.id !== id)
    this.usersById.delete(id)
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return true
  }

  getSalaryHistory(userId: string): SalaryHistory[] {
    return this.salaryHistory
      .filter((sh) => sh.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Attendance
  getTodayAttendance(userId: string): Attendance | null {
    // Synchronous - reads from memory after initial load
    const today = new Date().toISOString().split("T")[0]
    return (
      this.attendance.find((a) => a.userId === userId && a.date === today) ||
      null
    )
  }

  async clearAttendance(
    adminId: string
  ): Promise<{ message: string; deletedCount: number }> {
    await this.ensureDataLoaded()
    const result = await this.syncToAPI<{
      message: string
      deletedCount: number
    }>("attendance/clear", "DELETE", { adminId })
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return result
  }

  async punch(
    userId: string,
    type: Punch["type"],
    options?: {
      manualPunch?: boolean
      punchedBy?: string
      reason?: string
      customTime?: Date
    }
  ) {
    // For break punches, reason is required (unless it's a manual punch by admin)
    if (
      (type === "BREAK_START" || type === "BREAK_END") &&
      !options?.reason &&
      !options?.manualPunch
    ) {
      throw new Error("Reason is required for break punches")
    }

    const punchTime = options?.customTime || new Date()
    const punchDate = punchTime.toISOString().split("T")[0]

    // Check if user has an open attendance from a previous day (only for regular punches, not manual with custom time)
    if (!options?.customTime) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      await this.ensureDataLoaded()
      const yesterdayAtt = this.attendance.find(
        (a) =>
          a.userId === userId &&
          a.date === yesterdayStr &&
          a.punches.length > 0 &&
          a.punches[a.punches.length - 1].type !== "OUT"
      )

      // If user was checked in from yesterday and checking in today, auto-checkout yesterday
      if (yesterdayAtt && type === "IN") {
        const lastPunch = yesterdayAtt.punches[yesterdayAtt.punches.length - 1]
        if (lastPunch.type === "IN" || lastPunch.type === "BREAK_END") {
          const midnight = new Date(yesterdayStr)
          midnight.setHours(23, 59, 59, 999)
          yesterdayAtt.punches.push({ at: midnight, type: "OUT" })
          this.calculateTotals(yesterdayAtt)
          await this.syncToAPI("attendance/punch", "POST", {
            userId,
            type: "OUT",
            date: yesterdayStr,
          })
        }
      }
    }

    // Sync punch to MongoDB
    const result = await this.syncToAPI<AttendancePayload>(
      "attendance/punch",
      "POST",
      {
        userId,
        type,
        manualPunch: options?.manualPunch || false,
        punchedBy: options?.punchedBy,
        reason: options?.reason,
        customTime: options?.customTime?.toISOString(),
      }
    )
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return {
      ...result,
      punches: result.punches.map((punch) => ({
        ...punch,
        at: new Date(punch.at),
      })),
    }
  }

  private calculateTotals(att: Attendance) {
    let workMin = 0
    let breakMin = 0
    let lastIn: Date | null = null
    let lastBreakStart: Date | null = null

    for (const punch of att.punches) {
      if (punch.type === "IN") {
        lastIn = new Date(punch.at)
      } else if (punch.type === "OUT" && lastIn) {
        workMin += (new Date(punch.at).getTime() - lastIn.getTime()) / 60000
        lastIn = null
      } else if (punch.type === "BREAK_START" && lastIn) {
        workMin += (new Date(punch.at).getTime() - lastIn.getTime()) / 60000
        lastBreakStart = new Date(punch.at)
        lastIn = null
      } else if (punch.type === "BREAK_END" && lastBreakStart) {
        breakMin +=
          (new Date(punch.at).getTime() - lastBreakStart.getTime()) / 60000
        lastIn = new Date(punch.at)
        lastBreakStart = null
      }
    }

    if (lastIn) {
      workMin += (Date.now() - lastIn.getTime()) / 60000
    }

    att.totals = {
      workMin: Math.round(workMin),
      breakMin: Math.round(breakMin),
    }
  }

  getAttendanceHistory(userId: string, limit = 30): Attendance[] {
    // Synchronous - reads from memory after initial load
    return this.attendance
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  getAllAttendance(): Attendance[] {
    // Synchronous - reads from memory after initial load
    return this.attendance.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  // Notes
  async addNote(
    text: string,
    userId: string,
    category: "order" | "general" | "reminder" = "general",
    adminOnly: boolean = false,
    subCategory?: "refill-stock" | "remove-from-stock" | "out-of-stock",
    imageUrl?: string
  ): Promise<Note> {
    const note = await this.syncToAPI<NotePayload>("notes", "POST", {
      text,
      createdBy: userId,
      category,
      adminOnly,
      subCategory,
      imageUrl,
    })
    if (note) {
      // Auto-refresh after CRUD operation
      await this.refreshData()
      return {
        ...note,
        createdAt: new Date(note.createdAt),
        completedAt: note.completedAt ? new Date(note.completedAt) : undefined,
        deletedAt: note.deletedAt ? new Date(note.deletedAt) : undefined,
      }
    }
    throw new Error("Failed to create note")
  }

  async updateNote(id: string, updates: Partial<Note>) {
    const note = this.notes.find((n) => n.id === id)
    if (note) {
      Object.assign(note, updates)
      await this.syncToAPI(`notes/${id}`, "PUT", updates)
      // Auto-refresh after CRUD operation
      await this.refreshData()
    }
  }

  async deleteNote(id: string, deletedBy?: string) {
    const note = this.notes.find((n) => n.id === id)
    if (note) {
      await this.syncToAPI(`notes/${id}`, "DELETE", { deletedBy })
      // Auto-refresh after CRUD operation
      await this.refreshData()
    }
  }

  async restoreNote(id: string) {
    const note = this.notes.find((n) => n.id === id)
    if (note) {
      note.deleted = false
      note.deletedAt = undefined
      note.deletedBy = undefined
      await this.syncToAPI(`notes/${id}/restore`, "POST", {})
      // Auto-refresh after CRUD operation
      await this.refreshData()
    }
  }

  async permanentDeleteNote(id: string) {
    await this.syncToAPI(`notes/${id}/permanent`, "DELETE", {})
    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  getNotes(
    status?: "pending" | "done",
    showAdminOnly: boolean = false,
    currentUserId?: string
  ): Note[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.notes.filter((n) => !n.deleted)
    if (status) {
      filtered = filtered.filter((n) => n.status === status)
    }
    if (showAdminOnly === false && currentUserId) {
      filtered = filtered.filter(
        (n) => !n.adminOnly || n.createdBy === currentUserId
      )
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  getDeletedNotes(userId?: string): Note[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.notes.filter((n) => n.deleted)
    if (userId) {
      const user = this.getCurrentUser()
      if (user?.role !== "admin") {
        filtered = filtered.filter((n) => n.createdBy === userId)
      }
    }
    return filtered.sort((a, b) => {
      const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
      const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
      return dateB - dateA
    })
  }

  // Leave
  async applyLeave(
    userId: string,
    date: string,
    type: "full" | "half",
    reason: string
  ): Promise<Leave> {
    const leave = await this.syncToAPI<Leave>("leaves", "POST", {
      userId,
      date,
      type,
      reason,
    })
    if (leave) {
      // Auto-refresh after CRUD operation
      await this.refreshData()
      return leave
    }
    throw new Error("Failed to create leave")
  }

  async updateLeaveStatus(
    id: string,
    status: "approved" | "rejected",
    salaryDeduction?: boolean,
    approvedBy?: string
  ) {
    await this.syncToAPI(`leaves/${id}`, "PUT", {
      status,
      salaryDeduction,
      approvedBy,
    })
    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  getUserLeaves(userId: string): Leave[] {
    // Synchronous - reads from memory after initial load
    return this.leaves
      .filter((l) => l.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  getPendingLeaves(): Leave[] {
    // Synchronous - reads from memory after initial load
    return this.leaves.filter((l) => l.status === "pending")
  }

  // Salary
  getSalary(userId: string, month: string): Salary | null {
    // Synchronous - reads from memory after initial load
    return (
      this.salaries.find((s) => s.userId === userId && s.month === month) ||
      null
    )
  }

  async updateSalary(salary: Salary) {
    const advances = salary.advances || []
    const storePurchases = salary.storePurchases || []
    const totalDeductions =
      advances.reduce((sum, a) => sum + (a.amount || 0), 0) +
      storePurchases.reduce((sum, p) => sum + (p.amount || 0), 0)

    const calcPay =
      salary.type === "hourly" ? salary.base * salary.hours : salary.base
    const finalPay = calcPay + (salary.adjustments || 0) - totalDeductions

    const updatedSalary: Salary = {
      ...salary,
      calcPay,
      advances,
      storePurchases,
      totalDeductions,
      finalPay,
    }

    const synced = await this.syncToAPI<SalaryPayload>(
      "salaries",
      "POST",
      updatedSalary as unknown as Record<string, unknown>
    )
    if (synced) {
      Object.assign(updatedSalary, {
        ...synced,
        advances: Array.isArray(synced.advances) ? synced.advances : [],
        storePurchases: Array.isArray(synced.storePurchases)
          ? synced.storePurchases
          : [],
        paid: Boolean(synced.paid),
        paidDate: synced.paidDate ?? undefined,
      })
    }

    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  getSalariesForMonth(month: string): Salary[] {
    // Synchronous - reads from memory after initial load
    return this.salaries.filter((s) => s.month === month)
  }

  getAllSalaries(): Salary[] {
    // Synchronous - reads from memory after initial load
    return this.salaries.sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month)
      if (monthCompare !== 0) return monthCompare
      return b.finalPay - a.finalPay
    })
  }

  async deleteSalary(id: string) {
    await this.syncToAPI(`salaries/${id}`, "DELETE")
    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  // Pending Advances
  async addPendingAdvance(
    userId: string,
    date: string,
    amount: number,
    description: string
  ): Promise<PendingAdvance> {
    const advance = await this.syncToAPI<PendingAdvance>(
      "pendingAdvances",
      "POST",
      { userId, date, amount, description }
    )
    if (advance) {
      // Auto-refresh after CRUD operation
      await this.refreshData()
      return advance
    }
    throw new Error("Failed to create advance")
  }

  getPendingAdvances(userId?: string): PendingAdvance[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.pendingAdvances.filter((a) => !a.deducted)
    if (userId) {
      filtered = filtered.filter((a) => a.userId === userId)
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async markAdvanceAsDeducted(advanceId: string, salaryId: string) {
    const advance = this.pendingAdvances.find((a) => a.id === advanceId)
    if (advance) {
      advance.deducted = true
      advance.deductedInSalaryId = salaryId
      await this.syncToAPI(`pendingAdvances/${advanceId}`, "PUT", { salaryId })
      // Auto-refresh after CRUD operation
      await this.refreshData()
    }
  }

  async deletePendingAdvance(id: string) {
    await this.syncToAPI(`pendingAdvances/${id}`, "DELETE")
    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  // Pending Store Purchases
  async addPendingStorePurchase(
    userId: string,
    date: string,
    amount: number,
    description: string
  ): Promise<PendingStorePurchase> {
    const purchase = await this.syncToAPI<PendingStorePurchase>(
      "pendingStorePurchases",
      "POST",
      { userId, date, amount, description }
    )
    if (purchase) {
      // Auto-refresh after CRUD operation
      await this.refreshData()
      return purchase
    }
    throw new Error("Failed to create store purchase")
  }

  getPendingStorePurchases(userId?: string): PendingStorePurchase[] {
    // Synchronous - reads from memory after initial load
    let filtered = this.pendingStorePurchases.filter((p) => !p.deducted)
    if (userId) {
      filtered = filtered.filter((p) => p.userId === userId)
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async markStorePurchaseAsDeducted(purchaseId: string, salaryId: string) {
    const purchase = this.pendingStorePurchases.find((p) => p.id === purchaseId)
    if (purchase) {
      purchase.deducted = true
      purchase.deductedInSalaryId = salaryId
      await this.syncToAPI(`pendingStorePurchases/${purchaseId}`, "PUT", {
        salaryId,
      })
      // Auto-refresh after CRUD operation
      await this.refreshData()
    }
  }

  async deletePendingStorePurchase(id: string) {
    await this.syncToAPI(`pendingStorePurchases/${id}`, "DELETE")
    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  // Announcements
  async addAnnouncement(title: string, body: string): Promise<Announcement> {
    const announcement = await this.syncToAPI<AnnouncementPayload>(
      "announcements",
      "POST",
      { title, body }
    )
    if (announcement) {
      // Auto-refresh after CRUD operation
      await this.refreshData()
      return {
        ...announcement,
        createdAt: new Date(announcement.createdAt),
        expiresAt: announcement.expiresAt
          ? new Date(announcement.expiresAt)
          : undefined,
      }
    }
    throw new Error("Failed to create announcement")
  }

  async markAnnouncementRead(id: string, userId: string) {
    const announcement = this.announcements.find((a) => a.id === id)
    if (announcement && !announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId)
      await this.syncToAPI(`announcements/${id}/read`, "PUT", { userId })
      // Auto-refresh after CRUD operation
      await this.refreshData()
    }
  }

  getActiveAnnouncements(): Announcement[] {
    // Synchronous - reads from memory after initial load
    const now = new Date()
    return this.announcements.filter(
      (ann: Announcement) => !ann.expiresAt || ann.expiresAt > now
    )
  }

  async clearAllData() {
    // This should only be available to admin and should clear MongoDB
    // For now, just clear local cache and refresh
    this.users = []
    this.attendance = []
    this.notes = []
    this.leaves = []
    this.salaries = []
    this.announcements = []
    this.salaryHistory = []
    this.pendingAdvances = []
    this.pendingStorePurchases = []
    this.notifications = []
    localStorage.clear()
    await this.refreshData()
  }

  // Notifications
  async loadNotifications(userId: string): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || ""
      const url = apiBase
        ? `${apiBase}/api/notifications?userId=${userId}`
        : `/api/notifications?userId=${userId}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load notifications: ${response.status}`)
      }
      this.notifications = await response.json()
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }

  getNotifications(userId: string, unreadOnly = false): Notification[] {
    let filtered = this.notifications.filter((n) => n.targetUserId === userId)
    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.read)
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  getUnreadNotificationCount(userId: string): number {
    return this.notifications.filter(
      (n) => n.targetUserId === userId && !n.read
    ).length
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || ""
      const url = apiBase
        ? `${apiBase}/api/notifications/${notificationId}/read`
        : `/api/notifications/${notificationId}/read`
      await fetch(url, { method: "PUT" })
      const notification = this.notifications.find(
        (n) => n.id === notificationId
      )
      if (notification) {
        notification.read = true
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || ""
      const url = apiBase
        ? `${apiBase}/api/notifications/read-all`
        : "/api/notifications/read-all"
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      this.notifications.forEach((n) => {
        if (n.targetUserId === userId) {
          n.read = true
        }
      })
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  // Late Permissions
  async requestLatePermission(
    userId: string,
    date: string,
    reason: string,
    expectedArrivalTime?: string
  ): Promise<LatePermission> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/latePermissions`
      : "/api/latePermissions"
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date, reason, expectedArrivalTime }),
    })
    if (!response.ok) {
      throw new Error(`Failed to request late permission: ${response.status}`)
    }
    return response.json()
  }

  async getLatePermissions(
    userId: string,
    status?: string
  ): Promise<LatePermission[]> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const statusParam = status ? `?status=${status}` : ""
    const url = apiBase
      ? `${apiBase}/api/latePermissions/user/${userId}${statusParam}`
      : `/api/latePermissions/user/${userId}${statusParam}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get late permissions: ${response.status}`)
    }
    return response.json()
  }

  async getPendingLatePermissions(): Promise<LatePermission[]> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/latePermissions/pending`
      : "/api/latePermissions/pending"
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get pending permissions: ${response.status}`)
    }
    return response.json()
  }

  async updateLatePermissionStatus(
    id: string,
    status: "approved" | "rejected",
    approvedBy: string,
    rejectionReason?: string
  ): Promise<LatePermission> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/latePermissions/${id}/status`
      : `/api/latePermissions/${id}/status`
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedBy, rejectionReason }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update permission status: ${response.status}`)
    }
    const result = await response.json()
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return result
  }

  // Late Approvals
  async getPendingLateApprovals(): Promise<LateApproval[]> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/lateApprovals/pending`
      : "/api/lateApprovals/pending"
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get pending approvals: ${response.status}`)
    }
    return response.json()
  }

  async getUserLateApprovals(userId: string): Promise<LateApproval[]> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/lateApprovals/user/${userId}`
      : `/api/lateApprovals/user/${userId}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get user approvals: ${response.status}`)
    }
    return response.json()
  }

  async updateLateApprovalStatus(
    id: string,
    status: "approved" | "rejected",
    approvedBy: string,
    rejectionReason?: string,
    adminNotes?: string
  ): Promise<LateApproval> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/lateApprovals/${id}/status`
      : `/api/lateApprovals/${id}/status`
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedBy, rejectionReason, adminNotes }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update approval status: ${response.status}`)
    }
    const result = await response.json()
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return result
  }

  // Chat methods
  async getChats(userId: string): Promise<Chat[]> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || ""
      const url = apiBase
        ? `${apiBase}/api/chats?userId=${userId}`
        : `/api/chats?userId=${userId}`
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to get chats: ${response.status} ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
        throw new Error(errorMessage)
      }
      return response.json()
    } catch (error) {
      console.error("getChats error:", error)
      throw error instanceof Error ? error : new Error("Failed to fetch chats")
    }
  }

  async getChatMessages(
    chatId: string,
    limit = 50,
    before?: string
  ): Promise<ChatMessage[]> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    let url = apiBase
      ? `${apiBase}/api/chats/${chatId}/messages?limit=${limit}`
      : `/api/chats/${chatId}/messages?limit=${limit}`
    if (before) {
      url += `&before=${before}`
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status}`)
    }
    return response.json()
  }

  async clearChatMessages(chatId: string): Promise<void> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/chats/${chatId}/messages`
      : `/api/chats/${chatId}/messages`

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to clear messages: ${response.status}`)
    }

    // Refresh data after clearing
    await this.refreshData()
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    message: string,
    attachments?: FileAttachment[],
    replyTo?: {
      messageId: string
      senderId: string
      senderName: string
      message: string
    }
  ): Promise<ChatMessage> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/chats/${chatId}/messages`
      : `/api/chats/${chatId}/messages`

    // Send empty string if message is empty but attachments exist
    const messageToSend = message || ""

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId,
        message: messageToSend,
        attachments,
        replyTo,
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Failed to send message: ${response.status} ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`
        }
      }
      throw new Error(errorMessage)
    }
    const result = await response.json()
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return result
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/chats/messages/${messageId}/read`
      : `/api/chats/messages/${messageId}/read`
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (!response.ok) {
      throw new Error(`Failed to mark message as read: ${response.status}`)
    }
    // Auto-refresh after CRUD operation
    await this.refreshData()
  }

  async getUnreadChatCount(userId: string): Promise<number> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/chats/unread-count?userId=${userId}`
      : `/api/chats/unread-count?userId=${userId}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get unread count: ${response.status}`)
    }
    const result = await response.json()
    return result.unreadCount || 0
  }

  async updateGroupName(
    chatId: string,
    name: string,
    userId: string
  ): Promise<Chat> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/chats/${chatId}/name`
      : `/api/chats/${chatId}/name`
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Failed to update group name: ${response.status} ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`
        }
      }
      throw new Error(errorMessage)
    }
    const result = await response.json()
    // Auto-refresh after CRUD operation
    await this.refreshData()
    return result
  }

  // File upload methods
  async getUploadUrl(
    fileName: string,
    fileType: string,
    fileSize?: number
  ): Promise<{ uploadUrl: string; key: string; fileUrl: string }> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/files/upload-url`
      : "/api/files/upload-url"
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileType, fileSize }),
    })
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status}`)
    }
    return response.json()
  }

  async uploadFileToS3(
    uploadUrl: string,
    file: File | Blob,
    contentType?: string
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type":
          contentType ||
          (file instanceof File ? file.type : "application/octet-stream"),
      },
      body: file,
    })
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status}`)
    }
  }

  async deleteFile(key: string): Promise<void> {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/files/${encodeURIComponent(key)}`
      : `/api/files/${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "DELETE",
    })
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status}`)
    }
  }
}

export const store = new Store();
