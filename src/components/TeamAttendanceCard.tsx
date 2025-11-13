import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CalendarIcon, Coffee, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Attendance, User, STORE_TIMINGS } from '@/lib/store';
import { store } from '@/lib/store';

interface TeamAttendanceCardProps {
  employee: User;
  attendance: Attendance | null;
  date?: string; // Optional date, defaults to today
}

export function TeamAttendanceCard({ employee, attendance, date }: TeamAttendanceCardProps) {
  // Helper function to calculate status based on store timings
  const calculatePunchStatus = (
    punchTime: Date,
    type: "IN" | "OUT"
  ): {
    status: "on-time" | "late" | "early" | "overtime"
    message?: string
  } => {
    const timeStr = punchTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const [hours, minutes] = timeStr.split(":").map(Number)
    const punchMinutes = hours * 60 + minutes

    if (type === "IN") {
      const [expectedHours, expectedMinutes] =
        STORE_TIMINGS.morningStart.split(":").map(Number)
      const expectedMinutesTotal =
        expectedHours * 60 + expectedMinutes

      if (punchMinutes < expectedMinutesTotal) {
        const diff = expectedMinutesTotal - punchMinutes
        return {
          status: "early",
          message: `${diff} minutes early`,
        }
      } else if (punchMinutes > expectedMinutesTotal) {
        const diff = punchMinutes - expectedMinutesTotal
        return {
          status: "late",
          message: `${diff} minutes late`,
        }
      }
      return { status: "on-time" }
    } else if (type === "OUT") {
      const [expectedHours, expectedMinutes] =
        STORE_TIMINGS.eveningEnd.split(":").map(Number)
      const expectedMinutesTotal =
        expectedHours * 60 + expectedMinutes

      if (punchMinutes < expectedMinutesTotal) {
        const diff = expectedMinutesTotal - punchMinutes
        return {
          status: "early",
          message: `${diff} minutes early`,
        }
      } else if (punchMinutes > expectedMinutesTotal) {
        const diff = punchMinutes - expectedMinutesTotal
        return {
          status: "overtime",
          message: `${diff} minutes overtime`,
        }
      }
      return { status: "on-time" }
    }
    return { status: "on-time" }
  }

  const targetDate = date || new Date().toISOString().split("T")[0];
  
  // Check if user is on leave
  const userLeaves = store.getUserLeaves(employee.id)
  const isOnLeave = userLeaves.some(
    (leave) =>
      leave.date === targetDate && leave.status === "approved"
  )

  const lastPunch =
    attendance?.punches[attendance.punches.length - 1]
  const status = lastPunch
    ? lastPunch.type === "IN"
      ? "checked-in"
      : lastPunch.type === "OUT"
      ? "checked-out"
      : lastPunch.type === "BREAK_START"
      ? "on-break"
      : "checked-in"
    : "not-checked-in"

  const isCheckedIn =
    status === "checked-in" || status === "on-break"
  const isCheckedOut = status === "checked-out"
  const isOnBreak = status === "on-break"

  const checkIn = attendance?.punches.find(
    (p) => p.type === "IN"
  )
  const checkOut = attendance?.punches.find(
    (p) => p.type === "OUT"
  )

  // Calculate check-in status (always recalculate to ensure accuracy)
  const checkInStatus = checkIn
    ? (() => {
        const checkInDate = typeof checkIn.at === 'string' ? new Date(checkIn.at) : checkIn.at;
        return calculatePunchStatus(checkInDate, "IN").status;
      })()
    : null

  // Calculate check-out status (always recalculate to ensure accuracy)
  const checkOutStatus = checkOut
    ? (() => {
        const checkOutDate = typeof checkOut.at === 'string' ? new Date(checkOut.at) : checkOut.at;
        return calculatePunchStatus(checkOutDate, "OUT").status;
      })()
    : null

  // Real-time updates for work and break time
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isCheckedIn || isOnBreak) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCheckedIn, isOnBreak]);

  // Calculate real-time work time if currently checked in
  const calculateRealTimeWork = () => {
    if (!attendance || !isCheckedIn || !checkIn) {
      return attendance?.totals.workMin || 0;
    }

    const now = currentTime.getTime();
    let workMs = 0;
    let lastIn: Date | null = null;
    let lastBreakStart: Date | null = null;

    for (const punch of attendance.punches) {
      const punchTime = new Date(punch.at).getTime();
      if (punch.type === "IN") {
        lastIn = new Date(punch.at);
      } else if (punch.type === "OUT" && lastIn) {
        workMs += punchTime - lastIn.getTime();
        lastIn = null;
      } else if (punch.type === "BREAK_START" && lastIn) {
        workMs += punchTime - lastIn.getTime();
        lastBreakStart = new Date(punch.at);
        lastIn = null;
      } else if (punch.type === "BREAK_END" && lastBreakStart) {
        lastIn = new Date(punch.at);
        lastBreakStart = null;
      }
    }

    if (lastIn) {
      workMs += now - lastIn.getTime();
    }

    return Math.round(workMs / 60000);
  };

  // Calculate real-time break time if currently on break
  const calculateRealTimeBreak = () => {
    if (!attendance) {
      return 0;
    }

    const now = currentTime.getTime();
    let breakMs = 0;
    let lastBreakStart: Date | null = null;

    for (const punch of attendance.punches) {
      const punchTime = new Date(punch.at).getTime();
      if (punch.type === "BREAK_START") {
        lastBreakStart = new Date(punch.at);
      } else if (punch.type === "BREAK_END" && lastBreakStart) {
        breakMs += punchTime - lastBreakStart.getTime();
        lastBreakStart = null;
      }
    }

    // If currently on break, add time from break start to now
    if (lastBreakStart && isOnBreak) {
      breakMs += now - lastBreakStart.getTime();
    }

    return Math.round(breakMs / 60000);
  };

  const displayWorkTime = calculateRealTimeWork();
  const displayBreakTime = calculateRealTimeBreak();

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const displayDate = date 
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Today';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-strong rounded-2xl p-3 sm:p-4 md:p-5 border transition-all hover:shadow-lg overflow-hidden ${
        isCheckedIn
          ? "border-success/30 bg-success/5"
          : isCheckedOut
          ? "border-muted/30 bg-muted/10"
          : "border-glass-border bg-card/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isCheckedIn
                ? "bg-success/20"
                : isCheckedOut
                ? "bg-muted/20"
                : "bg-muted/10"
            }`}
          >
            <Users
              className={`w-5 h-5 ${
                isCheckedIn
                  ? "text-success"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">
              {employee.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {displayDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end flex-shrink-0">
          {/* Status Indicator Dot */}
          <div
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
              isCheckedIn
                ? "bg-success shadow-sm shadow-success/50"
                : isCheckedOut
                ? "bg-muted-foreground"
                : "bg-muted-foreground/50"
            }`}
          >
            {isCheckedIn && (
              <div className="w-full h-full rounded-full bg-white/50 animate-pulse" />
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {/* On Leave Badge */}
            {isOnLeave && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-semibold bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <CalendarIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Leave</span>
              </span>
            )}

            {/* On Break Badge */}
            {isOnBreak && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-semibold bg-warning/20 text-warning border border-warning/30 flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Coffee className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Break</span>
              </span>
            )}

            {/* Late Badge */}
            {checkInStatus === "late" && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-semibold bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Late</span>
              </span>
            )}

            {/* Early Badge */}
            {checkInStatus === "early" && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-semibold bg-warning/20 text-warning border border-warning/30 flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Early</span>
              </span>
            )}

            {/* Early Checkout Badge */}
            {checkOutStatus === "early" && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-semibold bg-orange-500/20 text-orange-500 border border-orange-500/30 flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Early Out</span>
                <span className="sm:hidden">Early</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Check In Time */}
      {checkIn ? (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg bg-card border border-glass-border overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              Check In
            </span>
            {checkInStatus && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  checkInStatus === "late"
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : checkInStatus === "early"
                    ? "bg-warning/20 text-warning border border-warning/30"
                    : "bg-success/20 text-success border border-success/30"
                }`}
              >
                {checkInStatus === "late"
                  ? (() => {
                      const checkInDate = typeof checkIn.at === 'string' ? new Date(checkIn.at) : checkIn.at;
                      const statusInfo = calculatePunchStatus(
                        checkInDate,
                        "IN"
                      )
                      return statusInfo.message || "Late"
                    })()
                  : checkInStatus === "early"
                  ? (() => {
                      const checkInDate = typeof checkIn.at === 'string' ? new Date(checkIn.at) : checkIn.at;
                      const statusInfo = calculatePunchStatus(
                        checkInDate,
                        "IN"
                      )
                      return statusInfo.message || "Early"
                    })()
                  : "On Time"}
              </span>
            )}
          </div>
          <p className="text-sm font-bold">
            {formatTime(checkIn.at)}
          </p>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded-lg bg-muted/20 border border-muted/30">
          <p className="text-xs text-muted-foreground">
            Not checked in
          </p>
        </div>
      )}

      {/* Work Time & Break Time */}
      {attendance && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="glass-card rounded-xl p-2 sm:p-3 border border-glass-border overflow-hidden">
            <p className="text-xs text-muted-foreground mb-1">
              Work Time
            </p>
            <p className="text-lg font-bold">
              {Math.floor(displayWorkTime / 60)}h{" "}
              {displayWorkTime % 60}m
            </p>
          </div>
          <div className="glass-card rounded-xl p-2 sm:p-3 border border-glass-border overflow-hidden">
            <p className="text-xs text-muted-foreground mb-1">
              Break Time
            </p>
            <p className="text-lg font-bold">
              {Math.floor(displayBreakTime / 60)}h {displayBreakTime % 60}m
            </p>
          </div>
        </div>
      )}

      {/* Check Out Time */}
      {checkOut && (
        <div className="p-3 rounded-lg bg-card border border-glass-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              Check Out
            </span>
            {checkOutStatus === "overtime" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                Overtime
              </span>
            )}
            {checkOutStatus === "early" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/30 font-semibold">
                Early
              </span>
            )}
          </div>
          <p className="text-sm font-bold">
            {formatTime(checkOut.at)}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-3 flex justify-end">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            isCheckedIn
              ? isOnBreak
                ? "bg-warning/20 text-warning border border-warning/30"
                : "bg-success/20 text-success border border-success/30"
              : isCheckedOut
              ? "bg-muted/30 text-muted-foreground border border-muted-foreground/30"
              : "bg-muted/20 text-muted-foreground border border-muted-foreground/20"
          }`}
        >
          {isCheckedIn
            ? isOnBreak
              ? "On Break"
              : "Checked In"
            : isCheckedOut
            ? "Checked Out"
            : "Not In"}
        </span>
      </div>
    </motion.div>
  );
}

