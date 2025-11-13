import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CalendarIcon, Coffee, AlertTriangle, Clock, XCircle, CheckCircle2, X, Timer, MapPin, Home, Camera, ZoomIn, Loader2 } from 'lucide-react';
import { Attendance, User, STORE_TIMINGS, Punch } from '@/lib/store';
import { store } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TeamAttendanceCardProps {
  employee: User;
  attendance: Attendance | null;
  date?: string; // Optional date, defaults to today
}

// Helper function to get presigned URL for a file
async function getPresignedFileUrl(fileKey: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/files/${encodeURIComponent(fileKey)}?expiresIn=${expiresIn}`
      : `/api/files/${encodeURIComponent(fileKey)}?expiresIn=${expiresIn}`
    
    const response = await fetch(url)
    
    if (response.ok) {
      const data = await response.json()
      return data.url
    } else {
      const errorText = await response.text();
      console.error(`[getPresignedFileUrl] Error response (${response.status}):`, errorText);
      return null
    }
  } catch (err) {
    console.error("[getPresignedFileUrl] Exception:", err)
    return null
  }
}

// Component to display selfie image
function SelfieImage({ selfieUrl, punchType }: { selfieUrl: string; punchType: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!selfieUrl) {
        setError(true);
        setErrorMessage('No selfie URL provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);
      setErrorMessage(null);
      
      // Check if it's an S3 key (starts with "uploads/")
      const isS3Key = selfieUrl.startsWith('uploads/');
      
      if (isS3Key) {
        // For S3 keys, get presigned URL
        const presignedUrl = await getPresignedFileUrl(selfieUrl, 3600);
        if (presignedUrl) {
          setImageUrl(presignedUrl);
          setLoading(false);
        } else {
          console.error(`[SelfieImage] ${punchType}: Failed to get presigned URL for:`, selfieUrl);
          setError(true);
          setErrorMessage('Failed to load image');
          setLoading(false);
        }
      } else {
        // For direct URLs, use as-is
        setImageUrl(selfieUrl);
        setLoading(false);
      }
    };

    loadImage();
  }, [selfieUrl, punchType]);

  if (error) {
    return (
      <div className="w-full h-32 sm:h-36 flex flex-col items-center justify-center bg-destructive/10 border-2 border-destructive/30 rounded-lg p-2">
        <Camera className="w-8 h-8 text-destructive mb-2" />
        <p className="text-xs text-destructive text-center">{errorMessage || 'Failed to load image'}</p>
        <p className="text-[10px] text-muted-foreground mt-1 text-center break-all">{selfieUrl?.substring(0, 30)}...</p>
      </div>
    );
  }

  if (loading || !imageUrl) {
    return (
      <div className="w-full h-32 sm:h-36 flex flex-col items-center justify-center bg-secondary/20 border-2 border-primary/30 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Loading image...</p>
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative w-full h-32 sm:h-36 rounded-lg overflow-hidden border-2 border-primary/30 cursor-pointer hover:opacity-90 hover:border-primary transition-all group shadow-md"
        onClick={() => setShowFullscreen(true)}
      >
        <img
          src={imageUrl}
          alt={`${punchType} selfie`}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error(`[SelfieImage] ${punchType}: Image failed to load:`, e);
            setError(true);
            setErrorMessage('Image failed to load');
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
          <Camera className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <img
                src={imageUrl}
                alt={`${punchType} selfie - Full view`}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowFullscreen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function TeamAttendanceCard({ employee, attendance, date }: TeamAttendanceCardProps) {
  // Debug: Log selfie URLs if they exist (only once when attendance changes)
  useEffect(() => {
    if (attendance?.punches) {
      // Get the latest check-in and check-out
      const checkInPunches = attendance.punches.filter(p => p.type === 'IN').sort((a, b) => {
        const dateA = typeof a.at === 'string' ? new Date(a.at).getTime() : a.at.getTime();
        const dateB = typeof b.at === 'string' ? new Date(b.at).getTime() : b.at.getTime();
        return dateB - dateA;
      });
      const checkOutPunches = attendance.punches.filter(p => p.type === 'OUT').sort((a, b) => {
        const dateA = typeof a.at === 'string' ? new Date(a.at).getTime() : a.at.getTime();
        const dateB = typeof b.at === 'string' ? new Date(b.at).getTime() : b.at.getTime();
        return dateB - dateA;
      });
      
      const latestCheckIn = checkInPunches[0];
      const latestCheckOut = checkOutPunches[0];
      
      // Create a stable key to prevent re-logging
      const attendanceKey = attendance.punches.map(p => `${p.type}-${typeof p.at === 'string' ? p.at : p.at.toISOString()}-${p.selfieUrl || ''}`).join('|');
      
      console.log(`[TeamAttendanceCard] ${employee.name}:`, {
        hasCheckIn: !!latestCheckIn,
        checkInSelfieUrl: latestCheckIn?.selfieUrl || 'NONE',
        checkInSelfieUrlType: latestCheckIn?.selfieUrl ? typeof latestCheckIn.selfieUrl : 'N/A',
        hasCheckOut: !!latestCheckOut,
        checkOutSelfieUrl: latestCheckOut?.selfieUrl || 'NONE',
        checkOutSelfieUrlType: latestCheckOut?.selfieUrl ? typeof latestCheckOut.selfieUrl : 'N/A',
        allPunches: attendance.punches.map(p => ({ 
          type: p.type, 
          at: typeof p.at === 'string' ? p.at : p.at.toISOString(),
          hasSelfie: !!p.selfieUrl, 
          selfieUrl: p.selfieUrl,
          selfieUrlType: p.selfieUrl ? typeof p.selfieUrl : 'N/A'
        }))
      });
    } else {
      console.log(`[TeamAttendanceCard] ${employee.name}: No attendance data`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance?.punches?.length, employee.name]);

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

  // Get the latest check-in and check-out (most recent)
  const checkIn = attendance?.punches
    .filter((p) => p.type === "IN")
    .sort((a, b) => {
      const dateA = typeof a.at === 'string' ? new Date(a.at).getTime() : a.at.getTime();
      const dateB = typeof b.at === 'string' ? new Date(b.at).getTime() : b.at.getTime();
      return dateB - dateA; // Sort descending (newest first)
    })[0];
  
  const checkOut = attendance?.punches
    .filter((p) => p.type === "OUT")
    .sort((a, b) => {
      const dateA = typeof a.at === 'string' ? new Date(a.at).getTime() : a.at.getTime();
      const dateB = typeof b.at === 'string' ? new Date(b.at).getTime() : b.at.getTime();
      return dateB - dateA; // Sort descending (newest first)
    })[0];

  // Debug: Log the check-in/check-out objects being used (only when they change)
  const checkInKey = checkIn ? `${checkIn.type}-${typeof checkIn.at === 'string' ? checkIn.at : checkIn.at.toISOString()}-${checkIn.selfieUrl || ''}` : null;
  const checkOutKey = checkOut ? `${checkOut.type}-${typeof checkOut.at === 'string' ? checkOut.at : checkOut.at.toISOString()}-${checkOut.selfieUrl || ''}` : null;
  
  useEffect(() => {
    if (checkIn && checkInKey) {
      console.log(`[TeamAttendanceCard] ${employee.name} - CheckIn object:`, {
        type: checkIn.type,
        at: typeof checkIn.at === 'string' ? checkIn.at : checkIn.at.toISOString(),
        selfieUrl: checkIn.selfieUrl,
        selfieUrlType: checkIn.selfieUrl ? typeof checkIn.selfieUrl : 'undefined',
        hasSelfieUrl: !!checkIn.selfieUrl,
        allKeys: Object.keys(checkIn)
      });
    }
    if (checkOut && checkOutKey) {
      console.log(`[TeamAttendanceCard] ${employee.name} - CheckOut object:`, {
        type: checkOut.type,
        at: typeof checkOut.at === 'string' ? checkOut.at : checkOut.at.toISOString(),
        selfieUrl: checkOut.selfieUrl,
        selfieUrlType: checkOut.selfieUrl ? typeof checkOut.selfieUrl : 'undefined',
        hasSelfieUrl: !!checkOut.selfieUrl,
        allKeys: Object.keys(checkOut)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInKey, checkOutKey, employee.name]);

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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Process check-in/check-out pairs for detailed view
  const checkInOutPairs: Array<{
    checkIn: Punch;
    checkOut?: Punch;
    duration?: number;
  }> = [];
  let currentCheckIn: Punch | null = null;
  
  if (attendance) {
    for (const punch of attendance.punches) {
      if (punch.type === 'IN') {
        currentCheckIn = punch;
      } else if (punch.type === 'OUT' && currentCheckIn) {
        const checkOut = punch;
        const duration = Math.round((new Date(checkOut.at).getTime() - new Date(currentCheckIn.at).getTime()) / 60000);
        checkInOutPairs.push({
          checkIn: currentCheckIn,
          checkOut: checkOut,
          duration
        });
        currentCheckIn = null;
      }
    }
    
    // If there's a check-in without a check-out, add it as the last pair
    if (currentCheckIn) {
      checkInOutPairs.push({
        checkIn: currentCheckIn,
        checkOut: undefined,
        duration: undefined
      });
    }
  }

  // Process breaks to get pairs of start/end with durations
  const breakPairs: Array<{ 
    start: Date; 
    end?: Date; 
    duration?: number; 
    manualStart?: boolean; 
    manualEnd?: boolean; 
    reason?: string;
    startPunch?: Punch;
    endPunch?: Punch;
  }> = [];
  let currentBreakStart: { date: Date; manual?: boolean; reason?: string; punch?: Punch } | null = null;
  
  if (attendance) {
    for (const punch of attendance.punches) {
      if (punch.type === 'BREAK_START') {
        currentBreakStart = { 
          date: new Date(punch.at),
          manual: punch.manualPunch,
          reason: punch.reason,
          punch: punch
        };
      } else if (punch.type === 'BREAK_END' && currentBreakStart) {
        const breakEnd = new Date(punch.at);
        const duration = Math.round((breakEnd.getTime() - currentBreakStart.date.getTime()) / 60000);
        breakPairs.push({
          start: currentBreakStart.date,
          end: breakEnd,
          duration,
          manualStart: currentBreakStart.manual,
          manualEnd: punch.manualPunch,
          reason: currentBreakStart.reason,
          startPunch: currentBreakStart.punch,
          endPunch: punch
        });
        currentBreakStart = null;
      }
    }
    
    // If currently on break, add the ongoing break
    if (currentBreakStart && isOnBreak) {
      const now = currentTime.getTime();
      const duration = Math.round((now - currentBreakStart.date.getTime()) / 60000);
      breakPairs.push({
        start: currentBreakStart.date,
        end: undefined,
        duration,
        manualStart: currentBreakStart.manual,
        reason: currentBreakStart.reason,
        startPunch: currentBreakStart.punch
      });
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setDialogOpen(true)}
        className={`glass-strong rounded-2xl p-3 sm:p-4 md:p-5 border transition-all hover:shadow-lg overflow-hidden cursor-pointer ${
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
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              Check In
              {checkIn.remotePunch && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center gap-0.5">
                  <Home className="w-2.5 h-2.5" />
                  <span>Remote</span>
                </span>
              )}
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
          {checkIn.location && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {checkIn.location}
            </p>
          )}
          {checkIn.reason && (
            <p className="text-xs text-muted-foreground mt-1">
              Reason: {checkIn.reason}
            </p>
          )}
          <div className="mt-2 pt-2 border-t border-glass-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              Check-In Selfie
            </p>
            {checkIn.selfieUrl ? (
              <SelfieImage selfieUrl={checkIn.selfieUrl} punchType="Check-In" />
            ) : (
              <div className="w-full h-32 sm:h-36 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/10">
                <Camera className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground/70">No selfie captured</p>
                {/* Debug: Show what we have */}
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Debug: selfieUrl = {checkIn.selfieUrl ? `"${checkIn.selfieUrl}"` : 'undefined'}
                  </p>
                )}
              </div>
            )}
          </div>
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
          <div className="mt-2 pt-2 border-t border-glass-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              Check-Out Selfie
            </p>
            {checkOut.selfieUrl ? (
              <SelfieImage selfieUrl={checkOut.selfieUrl} punchType="Check-Out" />
            ) : (
              <div className="w-full h-32 sm:h-36 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/10">
                <Camera className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground/70">No selfie captured</p>
                {/* Debug: Show what we have */}
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Debug: selfieUrl = {checkOut.selfieUrl ? `"${checkOut.selfieUrl}"` : 'undefined'}
                  </p>
                )}
              </div>
            )}
          </div>
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

    {/* Detailed View Dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            {employee.name} - Attendance Details
          </DialogTitle>
          <DialogDescription>
            {displayDate} • {attendance ? 'Full attendance breakdown' : 'No attendance record'}
          </DialogDescription>
        </DialogHeader>

        {!attendance ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No attendance record for this date</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-xl p-4 border border-glass-border">
                <p className="text-xs text-muted-foreground mb-1">Work Time</p>
                <p className="text-2xl font-bold">
                  {Math.floor(displayWorkTime / 60)}h {displayWorkTime % 60}m
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 border border-glass-border">
                <p className="text-xs text-muted-foreground mb-1">Break Time</p>
                <p className="text-2xl font-bold">
                  {Math.floor(displayBreakTime / 60)}h {displayBreakTime % 60}m
                </p>
              </div>
            </div>

            {/* Check-In/Check-Out Sessions */}
            {checkInOutPairs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Check-In/Check-Out Sessions</h3>
                </div>
                <div className="space-y-2">
                  {checkInOutPairs.map((pair, index) => {
                    const checkInDate = typeof pair.checkIn.at === 'string' ? new Date(pair.checkIn.at) : pair.checkIn.at;
                    const checkInStatusInfo = calculatePunchStatus(checkInDate, "IN");
                    const checkOutStatusInfo = pair.checkOut 
                      ? calculatePunchStatus(typeof pair.checkOut.at === 'string' ? new Date(pair.checkOut.at) : pair.checkOut.at, "OUT")
                      : null;

                    return (
                      <div key={index} className="glass-card rounded-lg p-3 border border-glass-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-primary">Session {index + 1}</span>
                          {pair.duration !== undefined && (
                            <span className="text-xs font-bold">
                              {Math.floor(pair.duration / 60)}h {pair.duration % 60}m
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {/* Check In */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              <span className="text-xs text-muted-foreground">Check In</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{formatTime(pair.checkIn.at)}</span>
                              {checkInStatusInfo.status !== 'on-time' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  checkInStatusInfo.status === 'late' 
                                    ? 'bg-destructive/20 text-destructive' 
                                    : 'bg-warning/20 text-warning'
                                }`}>
                                  {checkInStatusInfo.message}
                                </span>
                              )}
                              {pair.checkIn.manualPunch && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                  Manual
                                </span>
                              )}
                            </div>
                          </div>
                          {pair.checkIn.selfieUrl && (
                            <div className="ml-7 mt-2">
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                Check-In Selfie
                              </p>
                              <SelfieImage selfieUrl={pair.checkIn.selfieUrl} punchType="Check-In" />
                            </div>
                          )}
                          {/* Check Out */}
                          {pair.checkOut ? (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Check Out</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold">{formatTime(pair.checkOut.at)}</span>
                                  {checkOutStatusInfo && checkOutStatusInfo.status !== 'on-time' && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      checkOutStatusInfo.status === 'early' 
                                        ? 'bg-orange-500/20 text-orange-500' 
                                        : 'bg-primary/20 text-primary'
                                    }`}>
                                      {checkOutStatusInfo.message}
                                    </span>
                                  )}
                                  {pair.checkOut.manualPunch && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                      Manual
                                    </span>
                                  )}
                                </div>
                              </div>
                              {pair.checkOut.selfieUrl && (
                                <div className="ml-7 mt-2">
                                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Camera className="w-3 h-3" />
                                    Check-Out Selfie
                                  </p>
                                  <SelfieImage selfieUrl={pair.checkOut.selfieUrl} punchType="Check-Out" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Timer className="w-3.5 h-3.5 text-success animate-pulse" />
                              <span className="text-xs text-success">Currently checked in</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Break Sessions */}
            {breakPairs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-warning" />
                  <h3 className="font-semibold text-sm">Break Sessions</h3>
                </div>
                <div className="space-y-2">
                  {breakPairs.map((breakPair, index) => (
                    <div key={index} className="glass-card rounded-lg p-3 border border-glass-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-warning">Break {index + 1}</span>
                        {breakPair.duration !== undefined && (
                          <span className="text-xs font-bold">
                            {Math.floor(breakPair.duration / 60)}h {breakPair.duration % 60}m
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {/* Break Start */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-3.5 h-3.5 text-warning" />
                            <span className="text-xs text-muted-foreground">Break Start</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{formatTime(breakPair.start)}</span>
                            {breakPair.manualStart && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Break End */}
                        {breakPair.end ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              <span className="text-xs text-muted-foreground">Break End</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{formatTime(breakPair.end)}</span>
                              {breakPair.manualEnd && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                  Manual
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-warning animate-pulse" />
                            <span className="text-xs text-warning">Currently on break</span>
                          </div>
                        )}
                        {/* Break Reason */}
                        {breakPair.reason && (
                          <div className="mt-2 pt-2 border-t border-glass-border">
                            <p className="text-[10px] text-muted-foreground">
                              <span className="font-medium">Reason:</span> {breakPair.reason}
                            </p>
                          </div>
                        )}
                        {/* Break Start Selfie */}
                        {breakPair.startPunch?.selfieUrl && (
                          <div className="mt-2 pt-2 border-t border-glass-border">
                            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Break Start Selfie
                            </p>
                            <SelfieImage 
                              selfieUrl={breakPair.startPunch.selfieUrl} 
                              punchType="Break Start" 
                            />
                          </div>
                        )}
                        {/* Break End Selfie */}
                        {breakPair.end && breakPair.endPunch?.selfieUrl && (
                          <div className="mt-2 pt-2 border-t border-glass-border">
                            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Break End Selfie
                            </p>
                            <SelfieImage 
                              selfieUrl={breakPair.endPunch.selfieUrl} 
                              punchType="Break End" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Summary */}
            <div className="pt-3 border-t border-glass-border">
              <div className="flex flex-wrap gap-2">
                {isOnLeave && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    On Leave
                  </span>
                )}
                {isOnBreak && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-warning/20 text-warning border border-warning/30 flex items-center gap-1">
                    <Coffee className="w-3 h-3" />
                    On Break
                  </span>
                )}
                {checkInStatus === "late" && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Late Arrival
                  </span>
                )}
                {checkInStatus === "early" && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-warning/20 text-warning border border-warning/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Early Arrival
                  </span>
                )}
                {checkIn?.remotePunch && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    Remote Check-In
                  </span>
                )}
                {checkOutStatus === "early" && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-orange-500/20 text-orange-500 border border-orange-500/30 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Early Checkout
                  </span>
                )}
                {checkOutStatus === "overtime" && (
                  <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Overtime
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

