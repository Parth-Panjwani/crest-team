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

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setAttendance(store.getTodayAttendance(user.id));
    }, 1000);

    setAnnouncements(
      store.getActiveAnnouncements().filter(a => !a.readBy.includes(user.id))
    );

    return () => clearInterval(timer);
  }, [user, navigate]);

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
  const pendingNotes = isAdmin ? store.getNotes('pending').length : 0;

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
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
              <p className="text-2xl font-mono text-primary mt-1">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
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

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-3xl p-6 mb-6 shadow-card"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full ${
              status === 'checked-in' ? 'bg-success animate-glow-pulse' :
              status === 'on-break' ? 'bg-warning animate-glow-pulse' :
              status === 'checked-out' ? 'bg-muted' :
              'bg-muted'
            }`} />
            <div>
              <h2 className="text-xl font-semibold">
                {status === 'checked-in' ? 'Checked In' :
                 status === 'on-break' ? 'On Break' :
                 status === 'checked-out' ? 'Checked Out' :
                 'Not Checked In'}
              </h2>
              {lastPunch && (
                <p className="text-sm text-muted-foreground">
                  Since {new Date(lastPunch.at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Work Time</span>
              </div>
              <p className="text-2xl font-bold">
                {Math.floor((attendance?.totals.workMin || 0) / 60)}h {(attendance?.totals.workMin || 0) % 60}m
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coffee className="w-4 h-4 text-warning" />
                <span className="text-sm text-muted-foreground">Break Time</span>
              </div>
              <p className="text-2xl font-bold">
                {Math.floor((attendance?.totals.breakMin || 0) / 60)}h {(attendance?.totals.breakMin || 0) % 60}m
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {status === 'not-checked-in' && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
                <Button onClick={handleCheckIn} className="w-full h-14 text-lg gradient-primary glow-primary">
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
                  <Button onClick={handleBreakEnd} className="w-full h-14 gradient-primary glow-primary">
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
                <Button onClick={handleCheckIn} className="w-full h-14 gradient-primary glow-primary">
                  <Clock className="mr-2 w-5 h-5" />
                  Check In Again
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Admin Quick Stats */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
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

            <div className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer" onClick={() => navigate('/order-pad')}>
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-6 h-6 text-primary" />
                {pendingNotes > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                    {pendingNotes}
                  </span>
                )}
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">Pending Orders</h3>
              <p className="text-2xl font-bold">{pendingNotes}</p>
            </div>

            <div className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer" onClick={() => navigate('/attendance')}>
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">Team Status</h3>
              <p className="text-2xl font-bold">View All</p>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
