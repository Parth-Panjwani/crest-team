import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Coffee, LogOut as LogOutIcon, Users, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Announcement } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const user = store.getCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendance, setAttendance] = useState(store.getTodayAttendance(user?.id || ''));
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check if day has changed
      const today = now.toISOString().split('T')[0];
      if (today !== currentDate) {
        setCurrentDate(today);
        // Refresh attendance for new day
        setAttendance(store.getTodayAttendance(user.id));
      } else {
        setAttendance(store.getTodayAttendance(user.id));
      }
    }, 1000);

    setAnnouncements(
      store.getActiveAnnouncements().filter(a => !a.readBy.includes(user.id))
    );

    return () => clearInterval(timer);
  }, [user, navigate, currentDate]);

  if (!user) return null;

  const lastPunch = attendance?.punches[attendance.punches.length - 1];
  const status = lastPunch
    ? lastPunch.type === 'IN'
      ? 'checked-in'
      : lastPunch.type === 'OUT'
      ? 'checked-out'
      : lastPunch.type === 'BREAK_START'
      ? 'on-break'
      : 'checked-in'
    : 'not-checked-in';

  // Calculate real-time elapsed time
  const calculateRealTimeWork = () => {
    if (!attendance || !attendance.punches.length) {
      return { workHours: 0, workMinutes: 0, workSeconds: 0, breakHours: 0, breakMinutes: 0, breakSeconds: 0 };
    }
    
    let workMs = 0;
    let breakMs = 0;
    let lastIn: Date | null = null;
    let lastBreakStart: Date | null = null;
    const now = currentTime.getTime();

    for (const punch of attendance.punches) {
      if (punch.type === 'IN') {
        lastIn = new Date(punch.at);
      } else if (punch.type === 'OUT' && lastIn) {
        workMs += new Date(punch.at).getTime() - lastIn.getTime();
        lastIn = null;
      } else if (punch.type === 'BREAK_START' && lastIn) {
        workMs += new Date(punch.at).getTime() - lastIn.getTime();
        lastBreakStart = new Date(punch.at);
        lastIn = null;
      } else if (punch.type === 'BREAK_END' && lastBreakStart) {
        breakMs += new Date(punch.at).getTime() - lastBreakStart.getTime();
        lastIn = new Date(punch.at);
        lastBreakStart = null;
      }
    }

    // If still checked in, calculate current work time
    if (lastIn && (status === 'checked-in' || status === 'on-break')) {
      workMs += now - lastIn.getTime();
    }
    // If on break, calculate current break time
    if (lastBreakStart && status === 'on-break') {
      breakMs += now - lastBreakStart.getTime();
    }

    // Convert to hours, minutes, seconds
    const workTotalSeconds = Math.floor(workMs / 1000);
    const workHours = Math.floor(workTotalSeconds / 3600);
    const workMinutes = Math.floor((workTotalSeconds % 3600) / 60);
    const workSeconds = workTotalSeconds % 60;

    const breakTotalSeconds = Math.floor(breakMs / 1000);
    const breakHours = Math.floor(breakTotalSeconds / 3600);
    const breakMinutes = Math.floor((breakTotalSeconds % 3600) / 60);
    const breakSeconds = breakTotalSeconds % 60;

    return { 
      workHours,
      workMinutes,
      workSeconds,
      breakHours,
      breakMinutes,
      breakSeconds
    };
  };

  const realTimeTotals = calculateRealTimeWork();

  const handleCheckIn = () => {
    store.punch(user.id, 'IN');
    setAttendance(store.getTodayAttendance(user.id));
    toast({ title: 'Checked In', description: 'Have a productive day!' });
  };

  const handleCheckOut = () => {
    store.punch(user.id, 'OUT');
    setAttendance(store.getTodayAttendance(user.id));
    toast({ title: 'Checked Out', description: 'See you tomorrow!' });
  };

  const handleBreakStart = () => {
    store.punch(user.id, 'BREAK_START');
    setAttendance(store.getTodayAttendance(user.id));
    toast({ title: 'Break Started', description: 'Take your time!' });
  };

  const handleBreakEnd = () => {
    store.punch(user.id, 'BREAK_END');
    setAttendance(store.getTodayAttendance(user.id));
    toast({ title: 'Break Ended', description: 'Back to work!' });
  };

  const dismissAnnouncement = (id: string) => {
    store.markAnnouncementRead(id, user.id);
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const isAdmin = user.role === 'admin';
  const pendingLeaves = isAdmin ? store.getPendingLeaves().length : 0;
  const pendingNotes = store.getNotes('pending', false, user.id).length;
  const allEmployees = isAdmin ? store.getAllUsers().filter(u => u.role === 'employee') : [];
  const todayAttendance = isAdmin ? allEmployees.map(emp => ({
    employee: emp,
    attendance: store.getTodayAttendance(emp.id)
  })) : [];

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 md:gap-4 w-full">
              {/* Company Logo - Mobile Only */}
              <div className="md:hidden flex items-center flex-shrink-0 z-10">
                <div className="flex items-center justify-center p-2.5 rounded-xl bg-white border-2 border-gray-300 shadow-md">
                  <img 
                    src="/logo.png" 
                    alt="Company Logo" 
                    className="h-12 w-auto object-contain"
                    style={{ display: "block", maxWidth: "80px", height: "auto" }}
                    onError={(e) => {
                      console.error('Logo failed to load');
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2 break-words">
                  Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]}!
                </h1>
              <p className="text-muted-foreground">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-2xl font-mono font-bold text-primary mt-1">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
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
              className="glass-card rounded-2xl p-4 mb-4 border-l-4 border-accent"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-accent mb-1">{announcement.title}</h3>
                  <p className="text-sm text-foreground/90">{announcement.body}</p>
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

        {/* Status Card - Only for Employees */}
        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-3xl p-6 md:p-8 mb-6 shadow-card border border-glass-border"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                status === 'checked-in' ? 'bg-success/20' :
                status === 'on-break' ? 'bg-warning/20' :
                status === 'checked-out' ? 'bg-muted/20' :
                'bg-muted/20'
              }`}>
                {status === 'checked-in' ? (
                  <Clock className="w-8 h-8 text-success" />
                ) : status === 'on-break' ? (
                  <Coffee className="w-8 h-8 text-warning" />
                ) : status === 'checked-out' ? (
                  <LogOutIcon className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Clock className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">
                  {status === 'checked-in' ? 'Checked In' :
                   status === 'on-break' ? 'On Break' :
                   status === 'checked-out' ? 'Checked Out' :
                   'Not Checked In'}
                </h2>
                {lastPunch && (
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(lastPunch.at).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Prominent Timer Display when Checked In */}
            {(status === 'checked-in' || status === 'on-break') && (
              <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Current Session</p>
                  <p className="text-5xl md:text-6xl font-bold font-mono text-primary">
                    {realTimeTotals.workHours > 0 && `${realTimeTotals.workHours}:`}
                    {realTimeTotals.workMinutes.toString().padStart(2, '0')}:
                    {realTimeTotals.workSeconds.toString().padStart(2, '0')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {realTimeTotals.workHours > 0 ? `${realTimeTotals.workHours}h ` : ''}
                    {realTimeTotals.workMinutes}m {realTimeTotals.workSeconds}s
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card rounded-2xl p-4 border border-glass-border">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Work Time</span>
                </div>
                <p className="text-2xl font-bold font-mono">
                  {realTimeTotals.workHours > 0 ? `${realTimeTotals.workHours}h ` : ''}
                  {realTimeTotals.workMinutes}m {realTimeTotals.workSeconds.toString().padStart(2, '0')}s
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-glass-border">
                <div className="flex items-center gap-2 mb-1">
                  <Coffee className="w-4 h-4 text-warning" />
                  <span className="text-sm text-muted-foreground">Break Time</span>
                </div>
                <p className="text-2xl font-bold font-mono">
                  {realTimeTotals.breakHours > 0 ? `${realTimeTotals.breakHours}h ` : ''}
                  {realTimeTotals.breakMinutes}m {realTimeTotals.breakSeconds.toString().padStart(2, '0')}s
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {status === 'not-checked-in' && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
                  <Button onClick={handleCheckIn} className="w-full h-14 text-lg gradient-primary shadow-md hover:shadow-lg">
                    <Clock className="mr-2 w-5 h-5" />
                    Check In
                  </Button>
                </motion.div>
              )}
              
              {status === 'checked-in' && (
                <>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={handleBreakStart} variant="secondary" className="w-full h-14">
                      <Coffee className="mr-2 w-5 h-5" />
                      Start Break
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={handleCheckOut} variant="outline" className="w-full h-14">
                      <LogOutIcon className="mr-2 w-5 h-5" />
                      Check Out
                    </Button>
                  </motion.div>
                </>
              )}

              {status === 'on-break' && (
                <>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={handleBreakEnd} className="w-full h-14 gradient-primary shadow-md hover:shadow-lg">
                      <Clock className="mr-2 w-5 h-5" />
                      End Break
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={handleCheckOut} variant="outline" className="w-full h-14">
                      <LogOutIcon className="mr-2 w-5 h-5" />
                      Check Out
                    </Button>
                  </motion.div>
                </>
              )}

              {status === 'checked-out' && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
                  <Button onClick={handleCheckIn} className="w-full h-14 gradient-primary shadow-md hover:shadow-lg">
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
              <div className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer" onClick={() => navigate('/leave')}>
                <div className="flex items-center justify-between mb-2">
                  <CalendarIcon className="w-6 h-6 text-accent" />
                  {pendingLeaves > 0 && (
                    <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {pendingLeaves}
                    </span>
                  )}
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Pending Leaves</h3>
                <p className="text-2xl font-bold">{pendingLeaves}</p>
              </div>

              <div className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer" onClick={() => navigate('/notes')}>
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-6 h-6 text-primary" />
                  {pendingNotes > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {pendingNotes}
                    </span>
                  )}
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Pending Notes</h3>
                <p className="text-2xl font-bold">{pendingNotes}</p>
              </div>

              <div className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer" onClick={() => navigate('/attendance')}>
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Team Status</h3>
                <p className="text-2xl font-bold">View All</p>
              </div>

              <div className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer" onClick={() => navigate('/staff')}>
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Total Staff</h3>
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
                <h2 className="text-xl font-semibold">Today's Team Attendance</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {todayAttendance.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No employees yet</p>
                ) : (
                  todayAttendance.map(({ employee, attendance }) => {
                    const lastPunch = attendance?.punches[attendance.punches.length - 1];
                    const status = lastPunch
                      ? lastPunch.type === 'IN'
                        ? 'checked-in'
                        : lastPunch.type === 'OUT'
                        ? 'checked-out'
                        : lastPunch.type === 'BREAK_START'
                        ? 'on-break'
                        : 'checked-in'
                      : 'not-checked-in';
                    
                    const isCheckedIn = status === 'checked-in' || status === 'on-break';
                    const isCheckedOut = status === 'checked-out';
                    const isOnBreak = status === 'on-break';
                    
                    return (
                      <div 
                        key={employee.id} 
                        className={`flex items-center justify-between p-4 rounded-xl transition-all border ${
                          isCheckedIn 
                            ? 'bg-success/10 border-success/30 hover:bg-success/15' 
                            : isCheckedOut
                            ? 'bg-muted/20 border-muted/30 hover:bg-muted/25'
                            : 'bg-secondary/30 border-glass-border hover:bg-secondary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex items-center justify-center ${
                            isCheckedIn 
                              ? 'bg-success shadow-sm shadow-success/50' 
                              : isCheckedOut
                              ? 'bg-muted-foreground'
                              : 'bg-muted-foreground/50'
                          }`}>
                            {isCheckedIn && (
                              <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                          <span className={`font-medium ${
                            isCheckedIn ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {employee.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {attendance ? (
                            <>
                              <span className={`font-semibold ${
                                isCheckedIn ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {Math.floor((attendance.totals.workMin || 0) / 60)}h {(attendance.totals.workMin || 0) % 60}m
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                                isCheckedIn 
                                  ? isOnBreak
                                    ? 'bg-warning/20 text-warning border border-warning/30'
                                    : 'bg-success/20 text-success border border-success/30'
                                  : isCheckedOut
                                  ? 'bg-muted/30 text-muted-foreground border border-muted-foreground/30'
                                  : 'bg-muted/20 text-muted-foreground border border-muted-foreground/20'
                              }`}>
                                {isCheckedIn 
                                  ? isOnBreak 
                                    ? 'On Break' 
                                    : 'Checked In'
                                  : isCheckedOut
                                  ? 'Checked Out'
                                  : 'Not In'}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Not checked in</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </Layout>
  );
}
