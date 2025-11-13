import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Coffee, Users, Filter, CheckCircle2, XCircle, Timer, UserPlus, Edit, AlertCircle, Bell, AlertTriangle, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Attendance as AttendanceType, User, STORE_TIMINGS, Punch } from '@/lib/store';
import { formatMinutesToHours } from '@/utils/timeFormat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStore';
import { RefreshButton } from '@/components/RefreshButton';

export default function Attendance() {
  // Subscribe to store updates to force re-renders when data changes
  useStore();
  
  const user = store.getCurrentUser();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'employees' | 'my-attendance'>(isAdmin ? 'employees' : 'my-attendance');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const allUsers = store.getAllUsers();
  const allEmployees = allUsers.filter(u => u.role === 'employee');
  const selectedUser = allUsers.find(u => u.id === selectedUserId);
  
  // Get attendance for selected user and date
  const allAttendance = selectedUserId === 'all' || !selectedUserId
    ? [] 
    : store.getAttendanceHistory(selectedUserId);
  const filteredAttendance = selectedDate && selectedDate !== ''
    ? allAttendance.filter(att => att.date === selectedDate)
    : allAttendance;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handlePunch = async (type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END', reason?: string) => {
    if (!user) return;
    try {
      await store.punch(user.id, type, reason ? { reason } : undefined);
      toast({ 
        title: type === 'IN' ? 'Checked In' : type === 'OUT' ? 'Checked Out' : type === 'BREAK_START' ? 'Break Started' : 'Break Ended',
        description: 'Attendance updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record punch',
        variant: 'destructive',
      });
    }
  };

  const handleBreakPunch = (type: 'BREAK_START' | 'BREAK_END') => {
    setPendingBreakType(type);
    setBreakReason('');
    setBreakReasonDialogOpen(true);
  };

  const confirmBreakPunch = async () => {
    if (!pendingBreakType) return;
    // Only require reason for break start, not break end
    if (pendingBreakType === 'BREAK_START' && !breakReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for the break',
        variant: 'destructive',
      });
      return;
    }
    await handlePunch(pendingBreakType, breakReason.trim() || undefined);
    setBreakReasonDialogOpen(false);
    setBreakReason('');
    setPendingBreakType(null);
  };

  // Helper function to calculate status based on store timings
  const calculatePunchStatus = (punchTime: Date, type: 'IN' | 'OUT'): { status: 'on-time' | 'late' | 'early' | 'overtime', message?: string } => {
    const timeStr = punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const [hours, minutes] = timeStr.split(':').map(Number);
    const punchMinutes = hours * 60 + minutes;

    if (type === 'IN') {
      const [expectedHours, expectedMinutes] = STORE_TIMINGS.morningStart.split(':').map(Number);
      const expectedMinutesTotal = expectedHours * 60 + expectedMinutes;
      
      if (punchMinutes < expectedMinutesTotal) {
        const diff = expectedMinutesTotal - punchMinutes;
        return { 
          status: 'early', 
          message: `${diff} minutes early` 
        };
      } else if (punchMinutes > expectedMinutesTotal) {
        const diff = punchMinutes - expectedMinutesTotal;
        return { 
          status: 'late', 
          message: `${diff} minutes late` 
        };
      }
      return { status: 'on-time' };
    } else if (type === 'OUT') {
      const [expectedHours, expectedMinutes] = STORE_TIMINGS.eveningEnd.split(':').map(Number);
      const expectedMinutesTotal = expectedHours * 60 + expectedMinutes;
      
      if (punchMinutes < expectedMinutesTotal) {
        const diff = expectedMinutesTotal - punchMinutes;
        return { 
          status: 'early', 
          message: `${diff} minutes early` 
        };
      } else if (punchMinutes > expectedMinutesTotal) {
        const diff = punchMinutes - expectedMinutesTotal;
        return { 
          status: 'overtime', 
          message: `${diff} minutes overtime` 
        };
      }
      return { status: 'on-time' };
    }
    return { status: 'on-time' };
  };

  const AttendanceCard = ({ att, employee }: { att: AttendanceType; employee?: User }) => {
    // Check if user is on leave for this date
    const userLeaves = employee ? store.getUserLeaves(employee.id) : [];
    const isOnLeave = userLeaves.some(leave => 
      leave.date === att.date && leave.status === 'approved'
    );

    // Process check-in/check-out pairs
    const checkInOutPairs: Array<{
      checkIn: Punch;
      checkOut?: Punch;
      duration?: number;
    }> = [];
    let currentCheckIn: Punch | null = null;
    
    for (const punch of att.punches) {
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
    
    // Process breaks to get pairs of start/end with manual punch info
    const breakPairs: Array<{ 
      start: Date; 
      end: Date; 
      duration: number; 
      manualStart?: boolean; 
      manualEnd?: boolean; 
      reason?: string;
    }> = [];
    let currentBreakStart: { date: Date; manual?: boolean; reason?: string } | null = null;
    
    for (const punch of att.punches) {
      if (punch.type === 'BREAK_START') {
        currentBreakStart = { 
          date: new Date(punch.at),
          manual: punch.manualPunch,
          reason: punch.reason
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
          reason: currentBreakStart.reason // Only use break start reason
        });
        currentBreakStart = null;
      }
    }
    
    // Check if currently on break and if complete
    const lastPunch = att.punches[att.punches.length - 1];
    const isOnBreak = lastPunch?.type === 'BREAK_START';
    const isComplete = lastPunch?.type === 'OUT';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 shadow-card border border-glass-border"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isComplete ? 'bg-muted/20' : 'bg-success/20'
              }`}>
                <Calendar className={`w-5 h-5 sm:w-6 sm:h-6 ${isComplete ? 'text-muted-foreground' : 'text-success'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold truncate">
                  {new Date(att.date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                {employee && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{employee.name}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
              isComplete ? 'bg-muted/20 text-muted-foreground' : 'bg-success/20 text-success'
            }`}>
              {isComplete ? (
                <>
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Complete</span>
                </>
              ) : (
                <>
                  <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>In Progress</span>
                </>
              )}
            </div>

            {/* On Leave Badge */}
            {isOnLeave && (
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>On Leave</span>
              </span>
            )}

            {/* On Break Badge */}
            {isOnBreak && (
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-warning/20 text-warning border border-warning/30 flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                <span>On Break</span>
              </span>
            )}

            {/* Late/Early Badges for Check-In */}
            {checkInOutPairs.length > 0 && checkInOutPairs[0].checkIn && (() => {
              const checkIn = checkInOutPairs[0].checkIn;
              const status = checkIn.status || calculatePunchStatus(new Date(checkIn.at), 'IN').status;
              
              if (status === 'late') {
                return (
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Late</span>
                  </span>
                );
              } else if (status === 'early') {
                return (
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-warning/20 text-warning border border-warning/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Early</span>
                  </span>
                );
              }
              return null;
            })()}

            {/* Early Checkout Badge */}
            {checkInOutPairs.length > 0 && checkInOutPairs[checkInOutPairs.length - 1].checkOut && (() => {
              const checkOut = checkInOutPairs[checkInOutPairs.length - 1].checkOut!;
              const status = checkOut.status || calculatePunchStatus(new Date(checkOut.at), 'OUT').status;
              
              if (status === 'early') {
                return (
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-orange-500/20 text-orange-500 border border-orange-500/30 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>Early Checkout</span>
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Detailed Insights Summary */}
        {(() => {
          const firstCheckIn = checkInOutPairs.length > 0 ? checkInOutPairs[0].checkIn : null;
          const lastCheckOut = checkInOutPairs.length > 0 && checkInOutPairs[checkInOutPairs.length - 1].checkOut 
            ? checkInOutPairs[checkInOutPairs.length - 1].checkOut 
            : null;
          
          const checkInStatusInfo = firstCheckIn 
            ? calculatePunchStatus(new Date(firstCheckIn.at), 'IN')
            : null;
          const checkOutStatusInfo = lastCheckOut
            ? calculatePunchStatus(new Date(lastCheckOut.at), 'OUT')
            : null;

          const lateCount = checkInOutPairs.filter(pair => {
            const status = pair.checkIn.status || calculatePunchStatus(new Date(pair.checkIn.at), 'IN').status;
            return status === 'late';
          }).length;
          
          const earlyCheckoutCount = checkInOutPairs.filter(pair => {
            if (!pair.checkOut) return false;
            const status = pair.checkOut.status || calculatePunchStatus(new Date(pair.checkOut.at), 'OUT').status;
            return status === 'early';
          }).length;

          return (
            <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Work Time */}
                <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-glass-border">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Work Time</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold">
                        {(() => {
                          // Calculate real-time work time if currently checked in
                          const checkIn = att.punches.find(p => p.type === 'IN');
                          const lastPunch = att.punches[att.punches.length - 1];
                          const isCheckedIn = lastPunch && (lastPunch.type === 'IN' || lastPunch.type === 'BREAK_END');
                          
                          if (isCheckedIn && checkIn) {
                            let workMs = 0;
                            let lastIn: Date | null = null;
                            let lastBreakStart: Date | null = null;
                            const now = new Date().getTime();
                            
                            for (const punch of att.punches) {
                              const punchTime = new Date(punch.at).getTime();
                              if (punch.type === 'IN') {
                                lastIn = new Date(punch.at);
                              } else if (punch.type === 'OUT' && lastIn) {
                                workMs += punchTime - lastIn.getTime();
                                lastIn = null;
                              } else if (punch.type === 'BREAK_START' && lastIn) {
                                workMs += punchTime - lastIn.getTime();
                                lastBreakStart = new Date(punch.at);
                                lastIn = null;
                              } else if (punch.type === 'BREAK_END' && lastBreakStart) {
                                lastIn = new Date(punch.at);
                                lastBreakStart = null;
                              }
                            }
                            
                            if (lastIn) {
                              workMs += now - lastIn.getTime();
                            }
                            
                            const workMin = Math.round(workMs / 60000);
                            return `${Math.floor(workMin / 60)}h ${workMin % 60}m`;
                          }
                          
                          return `${Math.floor(att.totals.workMin / 60)}h ${att.totals.workMin % 60}m`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Break Time */}
                <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-glass-border">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                      <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Break Time</p>
                      <p className="text-base sm:text-lg md:text-xl font-bold">
                        {Math.floor(att.totals.breakMin / 60)}h {att.totals.breakMin % 60}m
                      </p>
                    </div>
                  </div>
                </div>

                {/* Late Count */}
                {lateCount > 0 && (
                  <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Late Arrivals</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-destructive">
                          {lateCount}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Early Checkout Count */}
                {earlyCheckoutCount > 0 && (
                  <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-orange-500/30 bg-orange-500/5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Early Checkouts</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-orange-500">
                          {earlyCheckoutCount}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Status Information */}
              {(checkInStatusInfo || checkOutStatusInfo) && (
                <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-glass-border">
                  <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Timing Details</p>
                  <div className="space-y-2">
                    {firstCheckIn && checkInStatusInfo && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Expected Check-In:</span>
                        <span className="text-[10px] sm:text-xs font-medium">{STORE_TIMINGS.morningStart}</span>
                      </div>
                    )}
                    {firstCheckIn && checkInStatusInfo && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Actual Check-In:</span>
                        <span className="text-[10px] sm:text-xs font-medium">{formatTime(firstCheckIn.at)}</span>
                      </div>
                    )}
                    {firstCheckIn && checkInStatusInfo && checkInStatusInfo.status !== 'on-time' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Status:</span>
                        <span className={`text-[10px] sm:text-xs font-semibold ${
                          checkInStatusInfo.status === 'late' ? 'text-destructive' :
                          checkInStatusInfo.status === 'early' ? 'text-warning' :
                          'text-success'
                        }`}>
                          {checkInStatusInfo.message || checkInStatusInfo.status}
                        </span>
                      </div>
                    )}
                    {lastCheckOut && checkOutStatusInfo && (
                      <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Expected Check-Out:</span>
                        <span className="text-[10px] sm:text-xs font-medium">{STORE_TIMINGS.eveningEnd}</span>
                      </div>
                    )}
                    {lastCheckOut && checkOutStatusInfo && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Actual Check-Out:</span>
                        <span className="text-[10px] sm:text-xs font-medium">{formatTime(lastCheckOut.at)}</span>
                      </div>
                    )}
                    {lastCheckOut && checkOutStatusInfo && checkOutStatusInfo.status !== 'on-time' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Status:</span>
                        <span className={`text-[10px] sm:text-xs font-semibold ${
                          checkOutStatusInfo.status === 'early' ? 'text-orange-500' :
                          checkOutStatusInfo.status === 'overtime' ? 'text-primary' :
                          'text-success'
                        }`}>
                          {checkOutStatusInfo.message || checkOutStatusInfo.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="space-y-3 pt-3 sm:pt-4 border-t border-glass-border">
          {checkInOutPairs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">
                    {checkInOutPairs.length} {checkInOutPairs.length === 1 ? 'Session' : 'Sessions'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total: {Math.floor(att.totals.workMin / 60)}h {att.totals.workMin % 60}m</p>
                </div>
              </div>
              <div className="ml-9 sm:ml-11 space-y-2">
                {checkInOutPairs.map((pair, index) => (
                  <div key={index} className="glass-card rounded-lg sm:rounded-xl p-2 sm:p-3 border border-glass-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] sm:text-xs font-semibold text-primary">Session {index + 1}</p>
                        {(pair.checkIn.manualPunch || pair.checkOut?.manualPunch) && (
                          <span className="px-1 sm:px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] sm:text-[10px] border border-primary/30">
                            Manual
                          </span>
                        )}
                      </div>
                      {pair.duration !== undefined && (
                        <p className="text-[10px] sm:text-xs font-bold">{Math.floor(pair.duration / 60)}h {pair.duration % 60}m</p>
                      )}
                    </div>
                    
                    {/* Check In */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        pair.checkIn.status === 'late' ? 'bg-destructive/20' :
                        pair.checkIn.status === 'early' ? 'bg-warning/20' :
                        'bg-success/20'
                      }`}>
                        {pair.checkIn.status === 'late' ? (
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        ) : pair.checkIn.status === 'early' ? (
                          <Clock className="w-3 h-3 text-warning" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium">Check In</p>
                          {(() => {
                            const status = pair.checkIn.status || calculatePunchStatus(new Date(pair.checkIn.at), 'IN').status;
                            return (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                status === 'late' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                                status === 'early' ? 'bg-warning/20 text-warning border border-warning/30' :
                                'bg-success/20 text-success border border-success/30'
                              }`}>
                                {status === 'late' ? 'Late' : status === 'early' ? 'Early' : 'On Time'}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatTime(pair.checkIn.at)}
                          {(() => {
                            const statusInfo = calculatePunchStatus(new Date(pair.checkIn.at), 'IN');
                            if (statusInfo.status !== 'on-time' && statusInfo.message) {
                              return ` - ${statusInfo.message}`;
                            }
                            return pair.checkIn.statusMessage ? ` - ${pair.checkIn.statusMessage}` : '';
                          })()}
                        </p>
                        {pair.checkIn.lateApprovalId && !pair.checkIn.lateApprovalStatus && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 mt-1 inline-block">
                            Approval Required
                          </span>
                        )}
                        {pair.checkIn.lateApprovalStatus === 'approved' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success border border-success/30 mt-1 inline-block">
                            ✓ Approved
                          </span>
                        )}
                        {pair.checkIn.reason && (
                          <p className="text-[10px] text-muted-foreground italic mt-0.5">Reason: {pair.checkIn.reason}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Check Out */}
                    {pair.checkOut ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          (() => {
                            const status = pair.checkOut.status || calculatePunchStatus(new Date(pair.checkOut.at), 'OUT').status;
                            return status === 'overtime' ? 'bg-primary/20' :
                              status === 'early' ? 'bg-orange-500/20' :
                              'bg-success/20';
                          })()
                        }`}>
                          {(() => {
                            const status = pair.checkOut.status || calculatePunchStatus(new Date(pair.checkOut.at), 'OUT').status;
                            return status === 'overtime' ? (
                              <Clock className="w-3 h-3 text-primary" />
                            ) : status === 'early' ? (
                              <XCircle className="w-3 h-3 text-orange-500" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-success" />
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium">Check Out</p>
                            {(() => {
                              const status = pair.checkOut.status || calculatePunchStatus(new Date(pair.checkOut.at), 'OUT').status;
                              return (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  status === 'overtime' ? 'bg-primary/20 text-primary border border-primary/30' :
                                  status === 'early' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' :
                                  'bg-success/20 text-success border border-success/30'
                                }`}>
                                  {status === 'overtime' ? 'Overtime' : status === 'early' ? 'Early Checkout' : 'On Time'}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatTime(pair.checkOut.at)}
                            {(() => {
                              const statusInfo = calculatePunchStatus(new Date(pair.checkOut.at), 'OUT');
                              if (statusInfo.status !== 'on-time' && statusInfo.message) {
                                return ` - ${statusInfo.message}`;
                              }
                              return pair.checkOut.statusMessage ? ` - ${pair.checkOut.statusMessage}` : '';
                            })()}
                          </p>
                          {pair.checkOut.reason && (
                            <p className="text-[10px] text-muted-foreground italic mt-0.5">Reason: {pair.checkOut.reason}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-success/20">
                          <Timer className="w-3 h-3 text-success" />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">Still checked in</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {breakPairs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {breakPairs.length} {breakPairs.length === 1 ? 'Break' : 'Breaks'}
                  </p>
                  <p className="text-xs text-muted-foreground">Total: {Math.floor(att.totals.breakMin / 60)}h {att.totals.breakMin % 60}m</p>
                </div>
              </div>
              <div className="ml-11 space-y-2">
                {breakPairs.map((breakPair, index) => (
                  <div key={index} className="glass-card rounded-xl p-3 border border-glass-border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-warning">Break {index + 1}</p>
                        {(breakPair.manualStart || breakPair.manualEnd) && (
                          <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[10px] border border-warning/30">
                            Manual
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold">{breakPair.duration}m</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(breakPair.start)}</span>
                      <span>→</span>
                      <span>{formatTime(breakPair.end)}</span>
                    </div>
                    {breakPair.reason && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Reason: {breakPair.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const myAttendance = user ? store.getTodayAttendance(user.id) : null;
  const lastPunch = myAttendance?.punches[myAttendance.punches.length - 1];
  const myStatus = lastPunch
    ? lastPunch.type === 'IN'
      ? 'checked-in'
      : lastPunch.type === 'OUT'
      ? 'checked-out'
      : lastPunch.type === 'BREAK_START'
      ? 'on-break'
      : 'checked-in'
    : 'not-checked-in';

  // Manual punch dialog state
  const [isManualPunchDialogOpen, setIsManualPunchDialogOpen] = useState(false);
  const [selectedEmployeeForPunch, setSelectedEmployeeForPunch] = useState<User | null>(null);
  const [manualPunchType, setManualPunchType] = useState<'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END'>('IN');
  const [manualPunchTime, setManualPunchTime] = useState(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
    return { date: dateStr, time: timeStr };
  });
  const [manualPunchReason, setManualPunchReason] = useState('');
  const [breakReasonDialogOpen, setBreakReasonDialogOpen] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  const [pendingBreakType, setPendingBreakType] = useState<'BREAK_START' | 'BREAK_END' | null>(null);
  const [clearAttendanceDialogOpen, setClearAttendanceDialogOpen] = useState(false);

  const handleManualPunch = async () => {
    if (!selectedEmployeeForPunch || !user) return;
    
    const [hours, minutes] = manualPunchTime.time.split(':').map(Number);
    const punchDateTime = new Date(`${manualPunchTime.date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
    
    try {
      await store.punch(selectedEmployeeForPunch.id, manualPunchType, {
        manualPunch: true,
        punchedBy: user.id,
        reason: manualPunchReason || undefined,
        customTime: punchDateTime
      });
      
      toast({
        title: 'Manual Punch Recorded',
        description: `${manualPunchType} recorded for ${selectedEmployeeForPunch.name}`,
      });
      
      setIsManualPunchDialogOpen(false);
      setSelectedEmployeeForPunch(null);
      setManualPunchReason('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to record manual punch';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  // Admin view with tabs
  if (isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Staff Attendance</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Track and manage employee attendance</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <RefreshButton />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                  <Button
                    onClick={() => {
                      setSelectedEmployeeForPunch(null);
                      setManualPunchType('IN');
                      setManualPunchTime(() => {
                        const now = new Date();
                        return {
                          date: now.toISOString().split('T')[0],
                          time: now.toTimeString().split(' ')[0].slice(0, 5),
                        };
                      });
                      setManualPunchReason('');
                      setIsManualPunchDialogOpen(true);
                    }}
                    className="w-full sm:w-auto gradient-primary shadow-md hover:shadow-lg text-sm"
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Manual Punch</span>
                    <span className="sm:hidden">Punch</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                  <Button
                    onClick={() => setClearAttendanceDialogOpen(true)}
                    variant="destructive"
                    className="w-full sm:w-auto shadow-md hover:shadow-lg text-sm"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Clear All</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                </motion.div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'employees' | 'my-attendance')} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="employees">Employees</TabsTrigger>
                <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
              </TabsList>

              <TabsContent value="employees" className="space-y-6">
                {/* Filters Row */}
                <div className="glass-strong rounded-3xl p-4 md:p-6 border border-glass-border shadow-card">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Filter className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Filters</span>
                    </div>
                    
                    <div className="flex-1 w-full md:w-auto min-w-[200px]">
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          {allEmployees.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 w-full md:w-auto min-w-[200px]">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-glass-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <Button
                      variant={selectedDate === today ? 'default' : 'outline'}
                      onClick={() => {
                        if (selectedDate === today) {
                          setSelectedDate('');
                          setSelectedUserId('all');
                        } else {
                          setSelectedDate(today);
                        }
                      }}
                      className={selectedDate === today ? 'gradient-primary shadow-md' : ''}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Today
                    </Button>
                  </div>
                </div>

                {/* Attendance Insights - Only when viewing all employees */}
                {selectedUserId === 'all' && (
                  <div className="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-glass-border shadow-card">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold">Attendance Insights</h2>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Overview of staff attendance patterns</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                      {(() => {
                        const todayAttendances = allEmployees.map(emp => ({
                          employee: emp,
                          attendance: store.getTodayAttendance(emp.id)
                        })).filter(item => item.attendance);

                        const checkedInCount = todayAttendances.filter(item => {
                          const lastPunch = item.attendance?.punches[item.attendance.punches.length - 1];
                          return lastPunch?.type === 'IN' || lastPunch?.type === 'BREAK_END';
                        }).length;

                        const lateArrivals = todayAttendances.filter(item => {
                          const checkIn = item.attendance?.punches.find(p => p.type === 'IN');
                          return checkIn?.status === 'late';
                        });

                        const totalLateMinutes = lateArrivals.reduce((sum, item) => {
                          const checkIn = item.attendance?.punches.find(p => p.type === 'IN');
                          if (checkIn?.status === 'late' && checkIn.statusMessage) {
                            // Extract minutes from status message or calculate
                            const punchTime = new Date(checkIn.at);
                            const storeOpen = new Date(punchTime);
                            storeOpen.setHours(9, 30, 0, 0);
                            const diffMs = punchTime.getTime() - storeOpen.getTime();
                            const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
                            return sum + diffMinutes;
                          }
                          return sum;
                        }, 0);

                        const avgLateMinutes = lateArrivals.length > 0 ? totalLateMinutes / lateArrivals.length : 0;

                        return (
                          <>
                            <div className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-glass-border">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Checked In Today</p>
                              <p className="text-lg sm:text-2xl font-bold">{checkedInCount} / {allEmployees.length}</p>
                            </div>
                            <div className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-glass-border">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Late Arrivals</p>
                              <p className="text-lg sm:text-2xl font-bold text-destructive">{lateArrivals.length}</p>
                            </div>
                            <div className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-glass-border">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Avg Late Time</p>
                              <p className="text-lg sm:text-2xl font-bold">{lateArrivals.length > 0 ? formatMinutesToHours(Math.round(avgLateMinutes)) : '0m'}</p>
                            </div>
                            <div className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-glass-border">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">On Time Rate</p>
                              <p className="text-lg sm:text-2xl font-bold text-success">
                                {todayAttendances.length > 0 
                                  ? Math.round(((todayAttendances.length - lateArrivals.length) / todayAttendances.length) * 100)
                                  : 0}%
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Staff Attendance Grid */}
                {selectedUserId === 'all' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allEmployees.map((employee) => {
                      const empAttendance = selectedDate && selectedDate !== ''
                        ? store.getAttendanceHistory(employee.id).find(a => a.date === selectedDate)
                        : store.getTodayAttendance(employee.id);
                      
                      if (!empAttendance && selectedDate && selectedDate !== today) {
                        return null;
                      }

                      const lastPunch = empAttendance?.punches[empAttendance.punches.length - 1];
                      const isCheckedIn = lastPunch?.type === 'IN' || lastPunch?.type === 'BREAK_END';

                      return (
                        <motion.div
                          key={employee.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass-strong rounded-3xl p-5 border border-glass-border shadow-card hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                isCheckedIn ? 'bg-success/20' : 'bg-muted/20'
                              }`}>
                                <Users className={`w-6 h-6 ${isCheckedIn ? 'text-success' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <h3 className="font-bold text-base">{employee.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {selectedDate && selectedDate !== '' 
                                    ? new Date(selectedDate).toLocaleDateString('en-US', { 
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'Today'}
                                </p>
                              </div>
                            </div>
                            {(() => {
                              const checkIn = empAttendance?.punches.find(p => p.type === 'IN');
                              const needsApproval = checkIn?.lateApprovalId && !checkIn.lateApprovalStatus;
                              
                              if (needsApproval) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-warning" />
                                    <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                                  </div>
                                );
                              } else if (isCheckedIn) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                  </div>
                                );
                              } else {
                                return <div className="w-2 h-2 rounded-full bg-muted" />;
                              }
                            })()}
                          </div>

                          {empAttendance ? (
                            <>
                              {(() => {
                                const checkIn = empAttendance.punches.find(p => p.type === 'IN');
                                const checkOut = empAttendance.punches.find(p => p.type === 'OUT');
                                const isLate = checkIn?.status === 'late';
                                
                                // Calculate late minutes from 9:30 AM
                                let lateMinutes = 0;
                                if (checkIn && isLate) {
                                  const punchTime = new Date(checkIn.at);
                                  const storeOpen = new Date(punchTime);
                                  storeOpen.setHours(9, 30, 0, 0);
                                  const diffMs = punchTime.getTime() - storeOpen.getTime();
                                  lateMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
                                }

                                return (
                                  <>
                                    {checkIn && (
                                      <div className={`mb-3 p-2 sm:p-3 rounded-lg border ${
                                        isLate && checkIn.lateApprovalId && !checkIn.lateApprovalStatus
                                          ? 'border-warning/50 bg-warning/5'
                                          : isLate && checkIn.lateApprovalStatus === 'approved'
                                            ? 'border-success/50 bg-success/5'
                                            : 'border-glass-border bg-card'
                                      }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-medium text-muted-foreground">Check In</span>
                                            {isLate && checkIn.lateApprovalId && !checkIn.lateApprovalStatus && (
                                              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 font-semibold animate-pulse">
                                                Action Required
                                              </span>
                                            )}
                                          </div>
                                          {isLate ? (
                                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-semibold self-start sm:self-auto">
                                              {formatMinutesToHours(lateMinutes)} late
                                            </span>
                                          ) : checkIn.status === 'on-time' ? (
                                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-success/20 text-success border border-success/30 self-start sm:self-auto">
                                              On Time
                                            </span>
                                          ) : checkIn.status === 'early' ? (
                                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 self-start sm:self-auto">
                                              Early
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold mb-1">{formatTime(checkIn.at)}</p>
                                        {isLate && checkIn.lateApprovalId && !checkIn.lateApprovalStatus && (
                                          <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20">
                                            <p className="text-[10px] sm:text-xs font-medium text-warning flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                              <span>Pending Approval</span>
                                            </p>
                                            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                                              Review in Pending Approvals section
                                            </p>
                                          </div>
                                        )}
                                        {isLate && checkIn.lateApprovalStatus === 'approved' && (
                                          <div className="mt-2 p-2 rounded bg-success/10 border border-success/20">
                                            <p className="text-[10px] sm:text-xs font-medium text-success flex items-center gap-1">
                                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                              <span>Approved</span>
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                                      <div className="glass-card rounded-xl p-2 sm:p-3 border border-glass-border">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Work Time</p>
                                        <p className="text-base sm:text-lg font-bold">
                                          {Math.floor((empAttendance.totals.workMin || 0) / 60)}h {(empAttendance.totals.workMin || 0) % 60}m
                                        </p>
                                      </div>
                                      <div className="glass-card rounded-xl p-2 sm:p-3 border border-glass-border">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Break Time</p>
                                        <p className="text-base sm:text-lg font-bold">
                                          {Math.floor((empAttendance.totals.breakMin || 0) / 60)}h {(empAttendance.totals.breakMin || 0) % 60}m
                                        </p>
                                      </div>
                                    </div>
                                    {checkOut && (
                                      <div className={`mb-2 p-2 sm:p-3 rounded-lg border ${
                                        checkOut.status === 'overtime'
                                          ? 'border-primary/50 bg-primary/5'
                                          : checkOut.status === 'early'
                                            ? 'border-warning/50 bg-warning/5'
                                            : 'border-glass-border bg-card'
                                      }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                                          <span className="text-xs font-medium text-muted-foreground">Check Out</span>
                                          <div className="flex gap-2">
                                            {checkOut.status === 'overtime' && (
                                              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                                                Overtime
                                              </span>
                                            )}
                                            {checkOut.status === 'early' && (
                                              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 font-semibold">
                                                Early
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold">{formatTime(checkOut.at)}</p>
                                        {checkOut.statusMessage && (
                                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{checkOut.statusMessage}</p>
                                        )}
                                      </div>
                                    )}
                                    {lastPunch && !checkOut && (
                                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3 flex-shrink-0" />
                                        <span>Last: {formatTime(lastPunch.at)}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            <div className="text-center py-6">
                              <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-2">
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <p className="text-sm text-muted-foreground">No attendance record</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    {filteredAttendance.length === 0 ? (
                      <div className="glass-strong rounded-3xl p-12 text-center border border-glass-border">
                        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
                        <p className="text-muted-foreground">No attendance found for the selected date</p>
                      </div>
                    ) : (
                      filteredAttendance.map((att) => (
                        <AttendanceCard key={att.id} att={att} employee={selectedUser} />
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-attendance" className="space-y-6">
                {/* My Attendance Status Card */}
                <div className="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-card border border-glass-border">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      myStatus === 'checked-in' ? 'bg-success/20' :
                      myStatus === 'on-break' ? 'bg-warning/20' :
                      myStatus === 'checked-out' ? 'bg-muted/20' :
                      'bg-muted/20'
                    }`}>
                      {myStatus === 'checked-in' ? (
                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-success" />
                      ) : myStatus === 'on-break' ? (
                        <Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-warning" />
                      ) : myStatus === 'checked-out' ? (
                        <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                      ) : (
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1">
                        {myStatus === 'checked-in' ? 'Checked In' :
                         myStatus === 'on-break' ? 'On Break' :
                         myStatus === 'checked-out' ? 'Checked Out' :
                         'Not Checked In'}
                      </h2>
                      {lastPunch && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Since {formatTime(lastPunch.at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {myAttendance && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-glass-border">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Work Time</p>
                            <p className="text-lg sm:text-xl md:text-2xl font-bold">
                              {Math.floor((myAttendance.totals.workMin || 0) / 60)}h {(myAttendance.totals.workMin || 0) % 60}m
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-glass-border">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                            <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Break Time</p>
                            <p className="text-lg sm:text-xl md:text-2xl font-bold">
                              {Math.floor((myAttendance.totals.breakMin || 0) / 60)}h {(myAttendance.totals.breakMin || 0) % 60}m
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myStatus === 'not-checked-in' && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
                        <Button onClick={() => handlePunch('IN')} className="w-full h-14 text-lg gradient-primary shadow-md hover:shadow-lg">
                          <Clock className="mr-2 w-5 h-5" />
                          Check In
                        </Button>
                      </motion.div>
                    )}
                    
                    {myStatus === 'checked-in' && (
                      <>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={() => handlePunch('BREAK_START')} variant="secondary" className="w-full h-14">
                            <Coffee className="mr-2 w-5 h-5" />
                            Start Break
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={() => handlePunch('OUT')} variant="outline" className="w-full h-14">
                            <Clock className="mr-2 w-5 h-5" />
                            Check Out
                          </Button>
                        </motion.div>
                      </>
                    )}

                    {myStatus === 'on-break' && (
                      <>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={() => handleBreakPunch('BREAK_END')} className="w-full h-14 gradient-primary shadow-md hover:shadow-lg">
                            <Clock className="mr-2 w-5 h-5" />
                            End Break
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={() => handlePunch('OUT')} variant="outline" className="w-full h-14">
                            <Clock className="mr-2 w-5 h-5" />
                            Check Out
                          </Button>
                        </motion.div>
                      </>
                    )}

                    {myStatus === 'checked-out' && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
                        <Button onClick={() => handlePunch('IN')} className="w-full h-14 gradient-primary shadow-md hover:shadow-lg">
                          <Clock className="mr-2 w-5 h-5" />
                          Check In Again
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* My Attendance History */}
                <div>
                  <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">My Attendance History</h2>
                  <div className="glass-strong rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 border border-glass-border shadow-card">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
                          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold">Filter</span>
                      </div>
                      
                      <div className="flex-1 w-full sm:w-auto min-w-0">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl border border-glass-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                      </div>

                      <Button
                        variant={selectedDate === today ? 'default' : 'outline'}
                        onClick={() => {
                          if (selectedDate === today) {
                            setSelectedDate('');
                          } else {
                            setSelectedDate(today);
                          }
                        }}
                        className={`w-full sm:w-auto ${selectedDate === today ? 'gradient-primary shadow-md' : ''} text-sm`}
                        size="sm"
                      >
                        <Calendar className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Today</span>
                        <span className="sm:hidden">Today</span>
                      </Button>
                    </div>
                  </div>

                  {(() => {
                    const myHistory = user ? store.getAttendanceHistory(user.id) : [];
                    const filtered = selectedDate && selectedDate !== ''
                      ? myHistory.filter(att => att.date === selectedDate)
                      : myHistory;

                    return filtered.length === 0 ? (
                      <div className="glass-strong rounded-3xl p-12 text-center border border-glass-border">
                        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
                        <p className="text-muted-foreground">Start tracking your time to see history here</p>
                      </div>
                    ) : (
                      filtered.map((att) => <AttendanceCard key={att.id} att={att} />)
                    );
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Manual Punch Dialog */}
          <Dialog open={isManualPunchDialogOpen} onOpenChange={setIsManualPunchDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manual Punch</DialogTitle>
                <DialogDescription>
                  Record a manual punch for an employee
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={selectedEmployeeForPunch?.id || ''}
                      onValueChange={(value) => {
                        const emp = allEmployees.find(e => e.id === value);
                        setSelectedEmployeeForPunch(emp || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {allEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Punch Type</Label>
                    <Select
                      value={manualPunchType}
                      onValueChange={(value) => setManualPunchType(value as 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Check In</SelectItem>
                        <SelectItem value="OUT">Check Out</SelectItem>
                        <SelectItem value="BREAK_START">Break Start</SelectItem>
                        <SelectItem value="BREAK_END">Break End</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={manualPunchTime.date}
                        onChange={(e) => setManualPunchTime({ ...manualPunchTime, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={manualPunchTime.time}
                        onChange={(e) => setManualPunchTime({ ...manualPunchTime, time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      placeholder="e.g., Employee forgot to punch, arrived on time"
                      value={manualPunchReason}
                      onChange={(e) => setManualPunchReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Store Timings Info */}
                  <div className="glass-card rounded-xl p-4 border border-glass-border">
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Store Timings</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Morning:</span>
                        <span className="font-medium">{STORE_TIMINGS.morningStart} - {STORE_TIMINGS.morningEnd}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lunch:</span>
                        <span className="font-medium">{STORE_TIMINGS.lunchStart} - {STORE_TIMINGS.lunchEnd}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Evening:</span>
                        <span className="font-medium">{STORE_TIMINGS.eveningStart} - {STORE_TIMINGS.eveningEnd}</span>
                      </div>
                    </div>
                  </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsManualPunchDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleManualPunch}
                  disabled={!selectedEmployeeForPunch}
                  className="gradient-primary"
                >
                  Record Punch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Break Reason Dialog */}
          <Dialog open={breakReasonDialogOpen} onOpenChange={setBreakReasonDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{pendingBreakType === 'BREAK_START' ? 'Start Break' : 'End Break'}</DialogTitle>
                <DialogDescription>
                  {pendingBreakType === 'BREAK_START' 
                    ? 'Please provide a reason for this break'
                    : 'Optionally provide a reason for ending the break'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Reason {pendingBreakType === 'BREAK_START' ? '*' : '(Optional)'}</Label>
                  <Textarea
                    placeholder={pendingBreakType === 'BREAK_START' ? 'e.g., Lunch break, Personal break, etc.' : 'Enter reason (optional)'}
                    value={breakReason}
                    onChange={(e) => setBreakReason(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setBreakReasonDialogOpen(false);
                  setBreakReason('');
                  setPendingBreakType(null);
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmBreakPunch}
                  disabled={pendingBreakType === 'BREAK_START' && !breakReason.trim()}
                  className="gradient-primary"
                >
                  {pendingBreakType === 'BREAK_START' ? 'Start Break' : 'End Break'}
                </Button>
              </DialogFooter>
              </DialogContent>
          </Dialog>

          {/* Clear Attendance Confirmation Dialog */}
          <AlertDialog open={clearAttendanceDialogOpen} onOpenChange={setClearAttendanceDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Attendance Records?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete all attendance records for all staff members. This cannot be undone.
                  Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (!user) return;
                    try {
                      const result = await store.clearAttendance(user.id);
                      toast({
                        title: 'Attendance Cleared',
                        description: `Successfully deleted ${result.deletedCount} attendance record(s).`,
                      });
                      setClearAttendanceDialogOpen(false);
                      await store.refreshData();
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: error instanceof Error ? error.message : 'Failed to clear attendance records',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear All Records
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Layout>
    );
  }

  // Employee view
  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-4xl mx-auto overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">My Attendance</h1>
            <p className="text-sm text-muted-foreground">Track your daily attendance and work hours</p>
          </div>

          {/* Filters Row */}
          <div className="glass-strong rounded-3xl p-4 md:p-6 mb-6 border border-glass-border shadow-card">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Filter</span>
              </div>
              
              <div className="flex-1 w-full md:w-auto min-w-[200px]">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-glass-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button
                variant={selectedDate === today ? 'default' : 'outline'}
                onClick={() => {
                  if (selectedDate === today) {
                    setSelectedDate('');
                  } else {
                    setSelectedDate(today);
                  }
                }}
                className={selectedDate === today ? 'gradient-primary shadow-md' : ''}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Attendance List */}
        <div>
          {(() => {
            const myHistory = user ? store.getAttendanceHistory(user.id) : [];
            const filtered = selectedDate && selectedDate !== ''
              ? myHistory.filter(att => att.date === selectedDate)
              : myHistory;

            return filtered.length === 0 ? (
              <div className="glass-strong rounded-3xl p-12 text-center border border-glass-border">
                <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
                <p className="text-muted-foreground">Start tracking your time to see history here</p>
              </div>
            ) : (
              filtered.map((att) => <AttendanceCard key={att.id} att={att} />)
            );
          })()}
        </div>
      </div>
    </Layout>
  );
}
