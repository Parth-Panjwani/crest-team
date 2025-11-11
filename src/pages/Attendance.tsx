import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Coffee, Users, Filter, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Attendance as AttendanceType, User } from '@/lib/store';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';

export default function Attendance() {
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

  const handlePunch = (type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END') => {
    if (!user) return;
    store.punch(user.id, type);
    toast({ 
      title: type === 'IN' ? 'Checked In' : type === 'OUT' ? 'Checked Out' : type === 'BREAK_START' ? 'Break Started' : 'Break Ended',
      description: 'Attendance updated successfully'
    });
  };

  const AttendanceCard = ({ att, employee }: { att: AttendanceType; employee?: User }) => {
    const checkIn = att.punches.find(p => p.type === 'IN');
    const checkOut = att.punches.find(p => p.type === 'OUT');
    
    // Process breaks to get pairs of start/end
    const breakPairs: Array<{ start: Date; end: Date; duration: number }> = [];
    let currentBreakStart: Date | null = null;
    
    for (const punch of att.punches) {
      if (punch.type === 'BREAK_START') {
        currentBreakStart = new Date(punch.at);
      } else if (punch.type === 'BREAK_END' && currentBreakStart) {
        const breakEnd = new Date(punch.at);
        const duration = Math.round((breakEnd.getTime() - currentBreakStart.getTime()) / 60000);
        breakPairs.push({
          start: currentBreakStart,
          end: breakEnd,
          duration
        });
        currentBreakStart = null;
      }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 mb-4 shadow-card border border-glass-border"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                checkOut ? 'bg-muted/20' : 'bg-success/20'
              }`}>
                <Calendar className={`w-6 h-6 ${checkOut ? 'text-muted-foreground' : 'text-success'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {new Date(att.date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                {employee && (
                  <p className="text-sm text-muted-foreground">{employee.name}</p>
                )}
              </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
            checkOut ? 'bg-muted/20 text-muted-foreground' : 'bg-success/20 text-success'
          }`}>
            {checkOut ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </>
            ) : (
              <>
                <Timer className="w-4 h-4" />
                In Progress
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card rounded-2xl p-4 border border-glass-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Work Time</p>
                <p className="text-xl font-bold">
                  {Math.floor(att.totals.workMin / 60)}h {att.totals.workMin % 60}m
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-glass-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Break Time</p>
                <p className="text-xl font-bold">
                  {Math.floor(att.totals.breakMin / 60)}h {att.totals.breakMin % 60}m
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-glass-border">
          {checkIn && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Check In</p>
                <p className="text-xs text-muted-foreground">{formatTime(checkIn.at)}</p>
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
                      <p className="text-xs font-semibold text-warning">Break {index + 1}</p>
                      <p className="text-xs font-bold">{breakPair.duration}m</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(breakPair.start)}</span>
                      <span>→</span>
                      <span>{formatTime(breakPair.end)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {checkOut && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Check Out</p>
                <p className="text-xs text-muted-foreground">{formatTime(checkOut.at)}</p>
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

  // Admin view with tabs
  if (isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen p-3 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Staff Attendance</h1>
              <p className="text-sm text-muted-foreground">Track and manage employee attendance</p>
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
                            <div className={`w-3 h-3 rounded-full ${
                              isCheckedIn ? 'bg-success' : 'bg-muted'
                            }`} />
                          </div>

                          {empAttendance ? (
                            <>
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="glass-card rounded-xl p-3 border border-glass-border">
                                  <p className="text-xs text-muted-foreground mb-1">Work Time</p>
                                  <p className="text-lg font-bold">
                                    {Math.floor((empAttendance.totals.workMin || 0) / 60)}h {(empAttendance.totals.workMin || 0) % 60}m
                                  </p>
                                </div>
                                <div className="glass-card rounded-xl p-3 border border-glass-border">
                                  <p className="text-xs text-muted-foreground mb-1">Break Time</p>
                                  <p className="text-lg font-bold">
                                    {Math.floor((empAttendance.totals.breakMin || 0) / 60)}h {(empAttendance.totals.breakMin || 0) % 60}m
                                  </p>
                                </div>
                              </div>
                              {lastPunch && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>Last: {formatTime(lastPunch.at)}</span>
                                </div>
                              )}
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
                <div className="glass-strong rounded-3xl p-6 md:p-8 shadow-card border border-glass-border">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      myStatus === 'checked-in' ? 'bg-success/20' :
                      myStatus === 'on-break' ? 'bg-warning/20' :
                      myStatus === 'checked-out' ? 'bg-muted/20' :
                      'bg-muted/20'
                    }`}>
                      {myStatus === 'checked-in' ? (
                        <CheckCircle2 className="w-8 h-8 text-success" />
                      ) : myStatus === 'on-break' ? (
                        <Coffee className="w-8 h-8 text-warning" />
                      ) : myStatus === 'checked-out' ? (
                        <XCircle className="w-8 h-8 text-muted-foreground" />
                      ) : (
                        <Clock className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-1">
                        {myStatus === 'checked-in' ? 'Checked In' :
                         myStatus === 'on-break' ? 'On Break' :
                         myStatus === 'checked-out' ? 'Checked Out' :
                         'Not Checked In'}
                      </h2>
                      {lastPunch && (
                        <p className="text-sm text-muted-foreground">
                          Since {formatTime(lastPunch.at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {myAttendance && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="glass-card rounded-2xl p-4 border border-glass-border">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Work Time</p>
                            <p className="text-2xl font-bold">
                              {Math.floor((myAttendance.totals.workMin || 0) / 60)}h {(myAttendance.totals.workMin || 0) % 60}m
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="glass-card rounded-2xl p-4 border border-glass-border">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Coffee className="w-5 h-5 text-warning" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Break Time</p>
                            <p className="text-2xl font-bold">
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
                          <Button onClick={() => handlePunch('BREAK_END')} className="w-full h-14 gradient-primary shadow-md hover:shadow-lg">
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
                  <h2 className="text-xl font-bold mb-4">My Attendance History</h2>
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
        </div>
      </Layout>
    );
  }

  // Employee view
  return (
    <Layout>
      <div className="min-h-screen p-3 md:p-8 max-w-4xl mx-auto overflow-x-hidden">
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
