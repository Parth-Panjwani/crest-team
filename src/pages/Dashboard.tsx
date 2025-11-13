import { useEffect, useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Clock,
  Coffee,
  LogOut as LogOutIcon,
  Users,
  FileText,
  Calendar as CalendarIcon,
  Bell,
  X,
} from "lucide-react"
import { Layout } from "@/components/Layout"
import {
  store,
  Announcement,
  Notification,
  LateApproval,
  LatePermission,
  STORE_TIMINGS,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { formatMinutesToHours } from "@/utils/timeFormat"
import { useStore } from "@/hooks/useStore"
import { RefreshButton } from "@/components/RefreshButton"
import { TeamAttendanceCard } from "@/components/TeamAttendanceCard"

export default function Dashboard() {
  // Subscribe to store updates to force re-renders when data changes
  useStore()

  const user = store.getCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [attendance, setAttendance] = useState(
    store.getTodayAttendance(user?.id || "")
  )
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split("T")[0]
  )
  const [breakReasonDialogOpen, setBreakReasonDialogOpen] = useState(false)
  const [breakReason, setBreakReason] = useState("")
  const [pendingBreakType, setPendingBreakType] = useState<
    "BREAK_START" | "BREAK_END" | null
  >(null)
  const [pendingApprovals, setPendingApprovals] = useState<LateApproval[]>([])
  const [pendingPermissions, setPendingPermissions] = useState<
    LatePermission[]
  >([])
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<LateApproval | null>(
    null
  )
  const [approvalAction, setApprovalAction] = useState<
    "approve" | "reject" | null
  >(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [adminNotes, setAdminNotes] = useState("")

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }

    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)

      // Check if day has changed
      const today = now.toISOString().split("T")[0]
      if (today !== currentDate) {
        setCurrentDate(today)
      }
      // Always refresh attendance from store (store updates trigger re-renders via useStore hook)
      setAttendance(store.getTodayAttendance(user.id))
    }, 1000)

    setAnnouncements(
      store.getActiveAnnouncements().filter((a) => !a.readBy.includes(user.id))
    )

    // Load notifications and pending approvals for admins
    // Note: These are loaded in the separate useEffect below to avoid too many calls
    if (user.role === "admin") {
      store
        .loadNotifications(user.id)
        .catch((error) => {
          // Silently fail - notifications feature may not be fully implemented
          console.debug("Notifications not available:", error.message)
        })
        .then(() => {
          setNotifications(store.getNotifications(user.id, true))
        })
    }

    return () => clearInterval(timer)
  }, [user, navigate, currentDate])

  // Track if we're currently loading to prevent concurrent calls
  const isLoadingApprovalsRef = useRef(false)
  const isLoadingPermissionsRef = useRef(false)

  const loadPendingApprovals = useCallback(async () => {
    if (isLoadingApprovalsRef.current) return // Prevent concurrent calls
    isLoadingApprovalsRef.current = true
    try {
      const approvals = await store.getPendingLateApprovals()
      setPendingApprovals(approvals)
    } catch (error) {
      // Silently fail - late approvals feature may not be fully implemented
      console.debug(
        "Late approvals not available:",
        error instanceof Error ? error.message : String(error)
      )
      setPendingApprovals([])
    } finally {
      isLoadingApprovalsRef.current = false
    }
  }, [])

  const loadPendingPermissions = useCallback(async () => {
    if (isLoadingPermissionsRef.current) return // Prevent concurrent calls
    isLoadingPermissionsRef.current = true
    try {
      const permissions = await store.getPendingLatePermissions()
      setPendingPermissions(permissions)
    } catch (error) {
      // Silently fail - late permissions feature may not be fully implemented
      console.debug(
        "Late permissions not available:",
        error instanceof Error ? error.message : String(error)
      )
      setPendingPermissions([])
    } finally {
      isLoadingPermissionsRef.current = false
    }
  }, [])

  // Refresh notifications and approvals periodically for admins
  useEffect(() => {
    if (!user || user.role !== "admin") return

    const refreshAdminData = () => {
      store
        .loadNotifications(user.id)
        .catch((error) => {
          // Silently fail - notifications feature may not be fully implemented
          console.debug("Notifications not available:", error.message)
        })
        .then(() => {
          setNotifications(store.getNotifications(user.id, true))
        })
      loadPendingApprovals()
      loadPendingPermissions()
    }

    // Initial load with a small delay to avoid race conditions
    const initialTimeout = setTimeout(() => {
      refreshAdminData()
    }, 100)

    const interval = setInterval(refreshAdminData, 30000) // Refresh every 30 seconds

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [user, loadPendingApprovals, loadPendingPermissions])

  // Also refresh admin data when store updates (triggered by WebSocket)
  useEffect(() => {
    if (!user || user.role !== "admin") return

    // Refresh pending approvals and permissions when store updates
    // This ensures UI updates immediately after CRUD operations
    loadPendingApprovals()
    loadPendingPermissions()
  }) // Runs on every render (controlled by useStore hook)

  // Track previous values to only update when they actually change
  const prevAttendanceRef = useRef<string | null>(null)
  const prevAnnouncementsRef = useRef<string | null>(null)
  const prevNotificationsRef = useRef<string | null>(null)

  // Update state when store data changes (triggered by useStore hook)
  // This effect runs whenever the store notifies listeners (via useStore hook)
  // Only updates state from store, doesn't call async functions to avoid infinite loops
  useEffect(() => {
    if (!user) return

    const newAttendance = store.getTodayAttendance(user.id)
    const newAnnouncements = store
      .getActiveAnnouncements()
      .filter((a) => !a.readBy.includes(user.id))

    // Only update if values have actually changed (compare serialized versions)
    const newAttendanceKey = newAttendance
      ? `${newAttendance.date}-${newAttendance.punches.length}`
      : "null"
    if (newAttendanceKey !== prevAttendanceRef.current) {
      setAttendance(newAttendance)
      prevAttendanceRef.current = newAttendanceKey
    }

    const newAnnouncementsKey = JSON.stringify(
      newAnnouncements.map((a) => a.id)
    )
    if (newAnnouncementsKey !== prevAnnouncementsRef.current) {
      setAnnouncements(newAnnouncements)
      prevAnnouncementsRef.current = newAnnouncementsKey
    }

    if (user.role === "admin") {
      const newNotifications = store.getNotifications(user.id, true)
      const newNotificationsKey = JSON.stringify(
        newNotifications.map((n) => n.id)
      )
      if (newNotificationsKey !== prevNotificationsRef.current) {
        setNotifications(newNotifications)
        prevNotificationsRef.current = newNotificationsKey
      }
      // Don't call async functions here to avoid infinite loops
      // They're already called in other effects
    }
  }) // No dependencies - runs on every render, but useStore hook controls when renders happen

  const handleApprovalAction = async () => {
    if (!selectedApproval || !approvalAction || !user) return

    if (approvalAction === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      })
      return
    }

    try {
      await store.updateLateApprovalStatus(
        selectedApproval.id,
        approvalAction === "approve" ? "approved" : "rejected",
        user.id,
        approvalAction === "reject" ? rejectionReason.trim() : undefined,
        adminNotes.trim() || undefined
      )
      toast({
        title: approvalAction === "approve" ? "Approved" : "Rejected",
        description: `Late arrival ${
          approvalAction === "approve" ? "approved" : "rejected"
        } successfully`,
      })
      setApprovalDialogOpen(false)
      setSelectedApproval(null)
      setApprovalAction(null)
      setRejectionReason("")
      setAdminNotes("")
      await loadPendingApprovals()
      await store.loadNotifications(user.id)
      setNotifications(store.getNotifications(user.id, true))
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update approval",
        variant: "destructive",
      })
    }
  }

  const handlePermissionAction = async (
    permission: LatePermission,
    action: "approve" | "reject",
    reason?: string
  ) => {
    if (!user) return

    try {
      await store.updateLatePermissionStatus(
        permission.id,
        action,
        user.id,
        action === "reject" ? reason : undefined
      )
      toast({
        title: action === "approve" ? "Approved" : "Rejected",
        description: `Permission ${
          action === "approve" ? "approved" : "rejected"
        } successfully`,
      })
      await loadPendingPermissions()
      await store.loadNotifications(user.id)
      setNotifications(store.getNotifications(user.id, true))
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update permission",
        variant: "destructive",
      })
    }
  }

  if (!user) return null

  const lastPunch = attendance?.punches[attendance.punches.length - 1]
  const status = lastPunch
    ? lastPunch.type === "IN"
      ? "checked-in"
      : lastPunch.type === "OUT"
      ? "checked-out"
      : lastPunch.type === "BREAK_START"
      ? "on-break"
      : "checked-in"
    : "not-checked-in"

  // Calculate real-time elapsed time
  const calculateRealTimeWork = () => {
    if (!attendance || !attendance.punches.length) {
      return {
        workHours: 0,
        workMinutes: 0,
        workSeconds: 0,
        breakHours: 0,
        breakMinutes: 0,
        breakSeconds: 0,
      }
    }

    let workMs = 0
    let breakMs = 0
    let lastIn: Date | null = null
    let lastBreakStart: Date | null = null
    const now = currentTime.getTime()

    for (const punch of attendance.punches) {
      if (punch.type === "IN") {
        lastIn = new Date(punch.at)
      } else if (punch.type === "OUT" && lastIn) {
        workMs += new Date(punch.at).getTime() - lastIn.getTime()
        lastIn = null
      } else if (punch.type === "BREAK_START" && lastIn) {
        workMs += new Date(punch.at).getTime() - lastIn.getTime()
        lastBreakStart = new Date(punch.at)
        lastIn = null
      } else if (punch.type === "BREAK_END" && lastBreakStart) {
        breakMs += new Date(punch.at).getTime() - lastBreakStart.getTime()
        lastIn = new Date(punch.at)
        lastBreakStart = null
      }
    }

    // Determine current status from punches (not from the status variable which might be stale)
    const lastPunch = attendance.punches[attendance.punches.length - 1]
    const isCurrentlyCheckedIn =
      lastPunch && (lastPunch.type === "IN" || lastPunch.type === "BREAK_END")
    const isCurrentlyOnBreak = lastPunch && lastPunch.type === "BREAK_START"
    const isCurrentlyCheckedOut = lastPunch && lastPunch.type === "OUT"

    // If still checked in (not checked out), calculate current work time
    if (lastIn && isCurrentlyCheckedIn && !isCurrentlyCheckedOut) {
      workMs += now - lastIn.getTime()
    }
    // If on break, calculate current break time
    if (lastBreakStart && isCurrentlyOnBreak) {
      breakMs += now - lastBreakStart.getTime()
    }

    // Convert to hours, minutes, seconds
    const workTotalSeconds = Math.floor(workMs / 1000)
    const workHours = Math.floor(workTotalSeconds / 3600)
    const workMinutes = Math.floor((workTotalSeconds % 3600) / 60)
    const workSeconds = workTotalSeconds % 60

    const breakTotalSeconds = Math.floor(breakMs / 1000)
    const breakHours = Math.floor(breakTotalSeconds / 3600)
    const breakMinutes = Math.floor((breakTotalSeconds % 3600) / 60)
    const breakSeconds = breakTotalSeconds % 60

    return {
      workHours,
      workMinutes,
      workSeconds,
      breakHours,
      breakMinutes,
      breakSeconds,
    }
  }

  const realTimeTotals = calculateRealTimeWork()

  const handleCheckIn = async () => {
    try {
      await store.punch(user.id, "IN")
      // Store will auto-refresh via WebSocket, but refresh immediately for instant feedback
      await store.refreshData()
      toast({ title: "Checked In", description: "Have a productive day!" })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to check in",
        variant: "destructive",
      })
    }
  }

  const handleCheckOut = async () => {
    try {
      await store.punch(user.id, "OUT")
      // Store will auto-refresh via WebSocket, but refresh immediately for instant feedback
      await store.refreshData()
      toast({ title: "Checked Out", description: "See you tomorrow!" })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to check out",
        variant: "destructive",
      })
    }
  }

  const handleBreakStart = () => {
    setPendingBreakType("BREAK_START")
    setBreakReason("")
    setBreakReasonDialogOpen(true)
  }

  const handleBreakEnd = () => {
    setPendingBreakType("BREAK_END")
    setBreakReason("")
    setBreakReasonDialogOpen(true)
  }

  const confirmBreakPunch = async () => {
    if (!pendingBreakType || !user) return
    // Only require reason for break start, not break end
    if (pendingBreakType === "BREAK_START" && !breakReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the break",
        variant: "destructive",
      })
      return
    }
    try {
      await store.punch(
        user.id,
        pendingBreakType,
        breakReason.trim() ? { reason: breakReason.trim() } : undefined
      )
      // Store will auto-refresh via WebSocket, but refresh immediately for instant feedback
      await store.refreshData()
      toast({
        title:
          pendingBreakType === "BREAK_START" ? "Break Started" : "Break Ended",
        description:
          pendingBreakType === "BREAK_START"
            ? "Take your time!"
            : "Back to work!",
      })
      setBreakReasonDialogOpen(false)
      setBreakReason("")
      setPendingBreakType(null)
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to record break",
        variant: "destructive",
      })
    }
  }

  const dismissAnnouncement = (id: string) => {
    store.markAnnouncementRead(id, user.id)
    setAnnouncements(announcements.filter((a) => a.id !== id))
  }

  const isAdmin = user.role === "admin"
  const pendingLeaves = isAdmin ? store.getPendingLeaves().length : 0
  const pendingNotes = store.getNotes("pending", false, user.id).length
  const allEmployees = isAdmin
    ? store.getAllUsers().filter((u) => u.role === "employee")
    : []

  // Calculate today's attendance with real-time work time updates
  const calculateRealTimeWorkTime = (attendance: any) => {
    if (!attendance || !attendance.punches.length)
      return { workMin: 0, breakMin: 0 }

    const lastPunch = attendance.punches[attendance.punches.length - 1]
    const isCheckedIn =
      lastPunch && (lastPunch.type === "IN" || lastPunch.type === "BREAK_END")

    if (!isCheckedIn) {
      // If checked out, return static totals
      return attendance.totals
    }

    // Calculate real-time work time
    let workMs = 0
    let breakMs = 0
    let lastIn: Date | null = null
    let lastBreakStart: Date | null = null
    const now = currentTime.getTime()

    for (const punch of attendance.punches) {
      const punchTime = new Date(punch.at).getTime()
      if (punch.type === "IN") {
        lastIn = new Date(punch.at)
      } else if (punch.type === "OUT" && lastIn) {
        workMs += punchTime - lastIn.getTime()
        lastIn = null
      } else if (punch.type === "BREAK_START" && lastIn) {
        workMs += punchTime - lastIn.getTime()
        lastBreakStart = new Date(punch.at)
        lastIn = null
      } else if (punch.type === "BREAK_END" && lastBreakStart) {
        breakMs += punchTime - lastBreakStart.getTime()
        lastIn = new Date(punch.at)
        lastBreakStart = null
      }
    }

    if (lastIn) {
      workMs += now - lastIn.getTime()
    }
    if (lastBreakStart) {
      breakMs += now - lastBreakStart.getTime()
    }

    return {
      workMin: Math.round(workMs / 60000),
      breakMin: Math.round(breakMs / 60000),
    }
  }

  const todayAttendance = isAdmin
    ? allEmployees.map((emp) => {
        const attendance = store.getTodayAttendance(emp.id)
        return {
          employee: emp,
          attendance: attendance
            ? {
                ...attendance,
                totals: calculateRealTimeWorkTime(attendance),
              }
            : null,
        }
      })
    : []

  return (
    <Layout>
      <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 md:mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full">
              {/* Company Logo - Mobile Only */}
              <div className="md:hidden flex items-center flex-shrink-0 z-10">
                <div className="flex items-center justify-center p-2.5 rounded-xl bg-white border-2 border-gray-300 shadow-md">
                  <img
                    src="/logo.png"
                    alt="Company Logo"
                    className="h-12 w-auto object-contain"
                    style={{
                      display: "block",
                      maxWidth: "80px",
                      height: "auto",
                    }}
                    onError={(e) => {
                      console.error("Logo failed to load")
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2 break-words">
                  Good{" "}
                  {currentTime.getHours() < 12
                    ? "Morning"
                    : currentTime.getHours() < 18
                    ? "Afternoon"
                    : "Evening"}
                  , {user.name.split(" ")[0]}!
                </h1>
                <p className="text-muted-foreground">
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-2xl font-mono font-bold text-primary mt-1">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Announcements */}
          {announcements.map((announcement) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-accent overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-accent mb-1">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-foreground/90">
                    {announcement.body}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAnnouncement(announcement.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Pending Approvals - Only for Admins */}
        {isAdmin &&
          (pendingApprovals.length > 0 || pendingPermissions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="glass-strong rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 border border-glass-border shadow-card overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Pending Approvals</h2>
                    <p className="text-xs text-muted-foreground">
                      {pendingApprovals.length} late arrival
                      {pendingApprovals.length !== 1 ? "s" : ""} •{" "}
                      {pendingPermissions.length} permission request
                      {pendingPermissions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Late Arrival Approvals */}
                {pendingApprovals.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Late Arrivals
                    </h3>
                    {pendingApprovals.map((approval) => {
                      const employee = store
                        .getAllUsers()
                        .find((u) => u.id === approval.userId)
                      return (
                        <motion.div
                          key={approval.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="glass-card rounded-xl p-3 sm:p-4 border border-glass-border overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="text-sm font-semibold">
                                  {employee?.name || "Unknown"}
                                </p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30">
                                  {formatMinutesToHours(approval.lateByMinutes)}{" "}
                                  late
                                </span>
                                {approval.hasPermission && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                    Has Permission
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Date:{" "}
                                {new Date(approval.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mb-1">
                                Checked in at:{" "}
                                {new Date(
                                  approval.punchTime
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground italic mb-1">
                                Work time starts from check-in (not approval)
                              </p>
                              <div className="flex gap-2 mt-3 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApproval(approval)
                                    setApprovalAction("approve")
                                    setRejectionReason("")
                                    setAdminNotes("")
                                    setApprovalDialogOpen(true)
                                  }}
                                  className="gradient-primary text-xs"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedApproval(approval)
                                    setApprovalAction("reject")
                                    setRejectionReason("")
                                    setAdminNotes("")
                                    setApprovalDialogOpen(true)
                                  }}
                                  className="text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Late Permission Requests */}
                {pendingPermissions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Permission Requests
                    </h3>
                    {pendingPermissions.map((permission) => {
                      const employee = store
                        .getAllUsers()
                        .find((u) => u.id === permission.userId)
                      return (
                        <motion.div
                          key={permission.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="glass-card rounded-xl p-3 sm:p-4 border border-glass-border overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="text-sm font-semibold">
                                  {employee?.name || "Unknown"}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Date:{" "}
                                {new Date(permission.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              {permission.expectedArrivalTime && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  Expected: {permission.expectedArrivalTime}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mb-2">
                                Reason: {permission.reason}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handlePermissionAction(
                                      permission,
                                      "approve"
                                    )
                                  }
                                  className="gradient-primary text-xs"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt("Rejection reason:")
                                    if (reason) {
                                      handlePermissionAction(
                                        permission,
                                        "reject",
                                        reason
                                      )
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        {/* Notifications - Only for Admins */}
        {isAdmin && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="glass-strong rounded-3xl p-6 border border-glass-border shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Recent Activity</h2>
                    <p className="text-xs text-muted-foreground">
                      {notifications.length} unread notification
                      {notifications.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (user) {
                      await store.markAllNotificationsAsRead(user.id)
                      setNotifications([])
                    }
                  }}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.slice(0, 5).map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-xl p-3 border border-glass-border flex items-start justify-between gap-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await store.markNotificationAsRead(notification.id)
                        setNotifications(
                          notifications.filter((n) => n.id !== notification.id)
                        )
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Card - Only for Employees */}
        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-3xl p-6 md:p-8 mb-6 shadow-card border border-glass-border"
          >
            <div className="flex items-center gap-4 mb-6">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  status === "checked-in"
                    ? "bg-success/20"
                    : status === "on-break"
                    ? "bg-warning/20"
                    : status === "checked-out"
                    ? "bg-muted/20"
                    : "bg-muted/20"
                }`}
              >
                {status === "checked-in" ? (
                  <Clock className="w-8 h-8 text-success" />
                ) : status === "on-break" ? (
                  <Coffee className="w-8 h-8 text-warning" />
                ) : status === "checked-out" ? (
                  <LogOutIcon className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Clock className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">
                  {status === "checked-in"
                    ? "Checked In"
                    : status === "on-break"
                    ? "On Break"
                    : status === "checked-out"
                    ? "Checked Out"
                    : "Not Checked In"}
                </h2>
                {lastPunch && (
                  <p className="text-sm text-muted-foreground">
                    Since{" "}
                    {new Date(lastPunch.at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Prominent Timer Display when Checked In */}
            {(status === "checked-in" || status === "on-break") && (
              <div className="mb-6 space-y-4">
                {/* Work Time Timer - Always visible when checked in */}
                <div
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    status === "on-break"
                      ? "bg-gradient-to-br from-muted/20 to-muted/10 border-muted/30 opacity-60"
                      : "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/40 shadow-lg shadow-primary/20"
                  }`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock
                        className={`w-5 h-5 ${
                          status === "on-break"
                            ? "text-muted-foreground"
                            : "text-primary"
                        }`}
                      />
                      <p
                        className={`text-sm font-semibold ${
                          status === "on-break"
                            ? "text-muted-foreground"
                            : "text-primary"
                        }`}
                      >
                        Work Time
                      </p>
                    </div>
                    <p
                      className={`text-5xl md:text-6xl font-bold font-mono ${
                        status === "on-break"
                          ? "text-muted-foreground"
                          : "text-primary"
                      }`}
                    >
                      {realTimeTotals.workHours > 0 &&
                        `${realTimeTotals.workHours}:`}
                      {realTimeTotals.workMinutes.toString().padStart(2, "0")}:
                      {realTimeTotals.workSeconds.toString().padStart(2, "0")}
                    </p>
                    <p
                      className={`text-xs mt-2 ${
                        status === "on-break"
                          ? "text-muted-foreground"
                          : "text-primary/80"
                      }`}
                    >
                      {realTimeTotals.workHours > 0
                        ? `${realTimeTotals.workHours}h `
                        : ""}
                      {realTimeTotals.workMinutes}m {realTimeTotals.workSeconds}
                      s
                    </p>
                  </div>
                </div>

                {/* Break Time Timer - Only visible when on break */}
                {status === "on-break" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-warning/30 to-warning/15 border-2 border-warning/50 shadow-lg shadow-warning/30"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Coffee className="w-5 h-5 text-warning animate-pulse" />
                        <p className="text-sm font-semibold text-warning">
                          Break Time
                        </p>
                      </div>
                      <p className="text-5xl md:text-6xl font-bold font-mono text-warning">
                        {realTimeTotals.breakHours > 0 &&
                          `${realTimeTotals.breakHours}:`}
                        {realTimeTotals.breakMinutes
                          .toString()
                          .padStart(2, "0")}
                        :
                        {realTimeTotals.breakSeconds
                          .toString()
                          .padStart(2, "0")}
                      </p>
                      <p className="text-xs text-warning/80 mt-2">
                        {realTimeTotals.breakHours > 0
                          ? `${realTimeTotals.breakHours}h `
                          : ""}
                        {realTimeTotals.breakMinutes}m{" "}
                        {realTimeTotals.breakSeconds}s
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                className={`glass-card rounded-2xl p-4 border transition-all ${
                  status === "on-break"
                    ? "border-muted/30 bg-muted/5"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock
                    className={`w-4 h-4 ${
                      status === "on-break"
                        ? "text-muted-foreground"
                        : "text-primary"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      status === "on-break"
                        ? "text-muted-foreground"
                        : "text-primary"
                    }`}
                  >
                    Work Time
                  </span>
                </div>
                <p
                  className={`text-2xl font-bold font-mono ${
                    status === "on-break"
                      ? "text-muted-foreground"
                      : "text-primary"
                  }`}
                >
                  {realTimeTotals.workHours > 0
                    ? `${realTimeTotals.workHours}h `
                    : ""}
                  {realTimeTotals.workMinutes}m{" "}
                  {realTimeTotals.workSeconds.toString().padStart(2, "0")}s
                </p>
              </div>
              <div
                className={`glass-card rounded-2xl p-4 border transition-all ${
                  status === "on-break"
                    ? "border-warning/50 bg-warning/10 shadow-md shadow-warning/20"
                    : "border-warning/20 bg-warning/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Coffee
                    className={`w-4 h-4 ${
                      status === "on-break"
                        ? "text-warning animate-pulse"
                        : "text-warning"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      status === "on-break"
                        ? "text-warning font-semibold"
                        : "text-warning"
                    }`}
                  >
                    Break Time
                  </span>
                </div>
                <p
                  className={`text-2xl font-bold font-mono ${
                    status === "on-break" ? "text-warning" : "text-warning/70"
                  }`}
                >
                  {realTimeTotals.breakHours > 0
                    ? `${realTimeTotals.breakHours}h `
                    : ""}
                  {realTimeTotals.breakMinutes}m{" "}
                  {realTimeTotals.breakSeconds.toString().padStart(2, "0")}s
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {status === "not-checked-in" && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="col-span-2"
                >
                  <Button
                    onClick={handleCheckIn}
                    className="w-full h-14 text-lg gradient-primary shadow-md hover:shadow-lg"
                  >
                    <Clock className="mr-2 w-5 h-5" />
                    Check In
                  </Button>
                </motion.div>
              )}

              {status === "checked-in" && (
                <>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleBreakStart}
                      variant="secondary"
                      className="w-full h-14"
                    >
                      <Coffee className="mr-2 w-5 h-5" />
                      Start Break
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleCheckOut}
                      variant="outline"
                      className="w-full h-14"
                    >
                      <LogOutIcon className="mr-2 w-5 h-5" />
                      Check Out
                    </Button>
                  </motion.div>
                </>
              )}

              {status === "on-break" && (
                <>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleBreakEnd}
                      className="w-full h-14 gradient-primary shadow-md hover:shadow-lg"
                    >
                      <Clock className="mr-2 w-5 h-5" />
                      End Break
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleCheckOut}
                      variant="outline"
                      className="w-full h-14"
                    >
                      <LogOutIcon className="mr-2 w-5 h-5" />
                      Check Out
                    </Button>
                  </motion.div>
                </>
              )}

              {status === "checked-out" && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="col-span-2"
                >
                  <Button
                    onClick={handleCheckIn}
                    className="w-full h-14 gradient-primary shadow-md hover:shadow-lg"
                  >
                    <Clock className="mr-2 w-5 h-5" />
                    Check In Again
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Admin Quick Stats */}
        {isAdmin && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6"
            >
              <div
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer"
                onClick={() => navigate("/leave")}
              >
                <div className="flex items-center justify-between mb-2">
                  <CalendarIcon className="w-6 h-6 text-accent" />
                  {pendingLeaves > 0 && (
                    <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {pendingLeaves}
                    </span>
                  )}
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Pending Leaves
                </h3>
                <p className="text-2xl font-bold">{pendingLeaves}</p>
              </div>

              <div
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer"
                onClick={() => navigate("/notes")}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-6 h-6 text-primary" />
                  {pendingNotes > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {pendingNotes}
                    </span>
                  )}
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Pending Notes
                </h3>
                <p className="text-2xl font-bold">{pendingNotes}</p>
              </div>

              <div
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer"
                onClick={() => navigate("/attendance")}
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Team Status
                </h3>
                <p className="text-2xl font-bold">View All</p>
              </div>

              <div
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer"
                onClick={() => navigate("/staff")}
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Total Staff
                </h3>
                <p className="text-2xl font-bold">{allEmployees.length}</p>
              </div>
            </motion.div>

            {/* Team Attendance Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Today's Team Attendance
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/attendance")}
                >
                  View All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {todayAttendance.length === 0 ? (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-center py-8">
                      No employees checked in yet
                    </p>
                  </div>
                ) : (
                  todayAttendance.map(({ employee, attendance }) => (
                    <TeamAttendanceCard
                      key={employee.id}
                      employee={employee}
                      attendance={attendance}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Break Reason Dialog */}
      <Dialog
        open={breakReasonDialogOpen}
        onOpenChange={setBreakReasonDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {pendingBreakType === "BREAK_START" ? "Start Break" : "End Break"}
            </DialogTitle>
            <DialogDescription>
              {pendingBreakType === "BREAK_START"
                ? "Please provide a reason for this break"
                : "Optionally provide a reason for ending the break"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>
                Reason {pendingBreakType === "BREAK_START" ? "*" : "(Optional)"}
              </Label>
              <Textarea
                placeholder={
                  pendingBreakType === "BREAK_START"
                    ? "e.g., Lunch break, Personal break, etc."
                    : "Enter reason (optional)"
                }
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBreakReasonDialogOpen(false)
                setBreakReason("")
                setPendingBreakType(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBreakPunch}
              disabled={
                pendingBreakType === "BREAK_START" && !breakReason.trim()
              }
              className="gradient-primary"
            >
              {pendingBreakType === "BREAK_START" ? "Start Break" : "End Break"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Action Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve"
                ? "Approve Late Arrival"
                : "Reject Late Arrival"}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval && (
                <>
                  {
                    store
                      .getAllUsers()
                      .find((u) => u.id === selectedApproval.userId)?.name
                  }{" "}
                  checked in at{" "}
                  {new Date(selectedApproval.punchTime).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}{" "}
                  ({formatMinutesToHours(selectedApproval.lateByMinutes)} late)
                  {selectedApproval.hasPermission && " (has permission)"}
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Note: Work time is calculated from actual check-in time, not
                    approval time
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {approvalAction === "reject" && (
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Please provide a reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            )}
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes or comments"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialogOpen(false)
                setSelectedApproval(null)
                setApprovalAction(null)
                setRejectionReason("")
                setAdminNotes("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprovalAction}
              disabled={approvalAction === "reject" && !rejectionReason.trim()}
              className={approvalAction === "approve" ? "gradient-primary" : ""}
              variant={approvalAction === "reject" ? "destructive" : "default"}
            >
              {approvalAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
