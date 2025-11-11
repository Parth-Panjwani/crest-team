import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, List, Clock, Coffee } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Attendance as AttendanceType } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function Attendance() {
  const user = store.getCurrentUser();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedUserId, setSelectedUserId] = useState(user?.id || '');
  
  const isAdmin = user?.role === 'admin';
  const users = isAdmin ? store.getAllUsers() : [user];
  const attendance = store.getAttendanceHistory(selectedUserId);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const AttendanceCard = ({ att }: { att: AttendanceType }) => {
    const checkIn = att.punches.find(p => p.type === 'IN');
    const checkOut = att.punches.find(p => p.type === 'OUT');
    const breaks = att.punches.filter(p => p.type === 'BREAK_START' || p.type === 'BREAK_END');

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 mb-4"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {new Date(att.date).toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </h3>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                {users.find(u => u.id === att.userId)?.name}
              </p>
            )}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            checkOut ? 'bg-muted text-muted-foreground' : 'bg-success/20 text-success'
          }`}>
            {checkOut ? 'Complete' : 'In Progress'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="glass-strong rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Work Time</span>
            </div>
            <p className="text-lg font-bold">
              {Math.floor(att.totals.workMin / 60)}h {att.totals.workMin % 60}m
            </p>
          </div>
          <div className="glass-strong rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coffee className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Break Time</span>
            </div>
            <p className="text-lg font-bold">
              {Math.floor(att.totals.breakMin / 60)}h {att.totals.breakMin % 60}m
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {checkIn && (
            <div className="flex items-center gap-2 text-success">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Check In: {formatTime(checkIn.at)}</span>
            </div>
          )}
          {breaks.length > 0 && (
            <div className="flex items-center gap-2 text-warning">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>{breaks.length / 2} break(s)</span>
            </div>
          )}
          {checkOut && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>Check Out: {formatTime(checkOut.at)}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold mb-4">Attendance History</h1>

          {/* View Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => setView('list')}
              className={view === 'list' ? 'gradient-primary' : ''}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              onClick={() => setView('calendar')}
              className={view === 'calendar' ? 'gradient-primary' : ''}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </div>

          {/* User Selector (Admin only) */}
          {isAdmin && users && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="glass-card rounded-xl px-4 py-3 w-full md:w-auto mb-4 bg-card text-foreground border border-glass-border"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </motion.div>

        {/* Attendance List */}
        <div>
          {attendance.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
              <p className="text-muted-foreground">Start tracking your time to see history here</p>
            </div>
          ) : (
            attendance.map((att) => <AttendanceCard key={att.id} att={att} />)
          )}
        </div>
      </div>
    </Layout>
  );
}
