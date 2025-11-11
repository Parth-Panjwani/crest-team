import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Plus, Check, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Leave as LeaveType } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Leave() {
  const user = store.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [leaves, setLeaves] = useState<LeaveType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    type: 'full' as 'full' | 'half',
    reason: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLeaves();
  }, [user]);

  const loadLeaves = () => {
    if (isAdmin) {
      setLeaves(store.getPendingLeaves());
    } else {
      setLeaves(store.getUserLeaves(user?.id || ''));
    }
  };

  const handleSubmit = () => {
    if (!formData.date || !formData.reason.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    store.applyLeave(user?.id || '', formData.date, formData.type, formData.reason);
    toast({
      title: 'Leave Requested',
      description: 'Your leave application has been submitted',
    });

    setFormData({ date: '', type: 'full', reason: '' });
    setShowForm(false);
    loadLeaves();
  };

  const handleApprove = (id: string) => {
    store.updateLeaveStatus(id, 'approved');
    toast({ title: 'Leave Approved' });
    loadLeaves();
  };

  const handleReject = (id: string) => {
    store.updateLeaveStatus(id, 'rejected');
    toast({ title: 'Leave Rejected' });
    loadLeaves();
  };

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              {isAdmin ? 'Leave Approvals' : 'Leave Requests'}
            </h1>
            {!isAdmin && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setShowForm(!showForm)}
                  className="gradient-primary shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Apply Leave
                </Button>
              </motion.div>
            )}
          </div>

          {/* Application Form */}
          {!isAdmin && showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-strong rounded-3xl p-6 mb-6 shadow-card"
            >
              <h2 className="text-xl font-bold mb-4">Apply for Leave</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 glass-card rounded-xl bg-card text-foreground border border-glass-border"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Leave Type</label>
                  <div className="flex gap-3">
                    <Button
                      variant={formData.type === 'full' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, type: 'full' })}
                      className={formData.type === 'full' ? 'gradient-primary flex-1' : 'flex-1'}
                    >
                      Full Day
                    </Button>
                    <Button
                      variant={formData.type === 'half' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, type: 'half' })}
                      className={formData.type === 'half' ? 'gradient-primary flex-1' : 'flex-1'}
                    >
                      Half Day
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Enter reason for leave..."
                    className="w-full h-24 px-4 py-3 glass-card rounded-xl bg-card text-foreground border border-glass-border resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="gradient-primary shadow-md hover:shadow-lg"
                  >
                    Submit Request
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Leave List */}
        <div className="space-y-4">
          {leaves.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">
                {isAdmin ? 'No Pending Approvals' : 'No Leave Requests'}
              </h3>
              <p className="text-muted-foreground">
                {isAdmin
                  ? 'All caught up! No pending leave requests to review'
                  : 'You haven\'t requested any leave yet'}
              </p>
            </div>
          ) : (
            leaves.map((leave, index) => (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    {isAdmin && (
                      <h3 className="font-semibold text-lg mb-1">
                        {store.getAllUsers().find(u => u.id === leave.userId)?.name}
                      </h3>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-foreground font-medium">
                        {new Date(leave.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        leave.type === 'full'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent/20 text-accent'
                      }`}>
                        {leave.type === 'full' ? 'Full Day' : 'Half Day'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    leave.status === 'approved'
                      ? 'bg-success/20 text-success'
                      : leave.status === 'rejected'
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-warning/20 text-warning'
                  }`}>
                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                  </span>
                </div>

                <p className="text-foreground/90 mb-4">{leave.reason}</p>

                {isAdmin && leave.status === 'pending' && (
                  <div className="flex gap-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={() => handleApprove(leave.id)}
                        className="w-full bg-success hover:bg-success/90"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={() => handleReject(leave.id)}
                        variant="destructive"
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
