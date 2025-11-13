import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users, Shield, User, History, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, User as UserType, Role, SalaryHistory } from '@/lib/store';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
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
import { RefreshButton } from '@/components/RefreshButton';

export default function Staff() {
  // Subscribe to store updates to force re-renders when data changes
  useStore();
  
  const user = store.getCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [staff, setStaff] = useState<UserType[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'employee' as Role,
    baseSalary: '',
    salaryChangeReason: '',
  });
  const [showSalaryHistory, setShowSalaryHistory] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadStaff();
  }, [user, navigate]);
  
  const loadStaff = useCallback(() => {
    const allUsers = store.getAllUsers();
    setStaff(allUsers);
  }, []);

  // Get current users count to detect store changes
  const usersCount = store.getAllUsers().length;

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStaff();
    }
  }, [user?.role, loadStaff, usersCount]); // Re-run when store data changes

  const handleCreate = async () => {
    setFormData({ name: '', pin: '', role: 'employee', baseSalary: '', salaryChangeReason: '' });
    setSelectedStaff(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (staffMember: UserType) => {
    setFormData({
      name: staffMember.name,
      pin: staffMember.pin,
      role: staffMember.role,
      baseSalary: staffMember.baseSalary?.toString() || '',
      salaryChangeReason: '',
    });
    setSelectedStaff(staffMember);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (staffMember: UserType) => {
    setSelectedStaff(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim() || !formData.pin.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive',
      });
      return;
    }

    // Check if PIN already exists
    const existingUser = store.getAllUsers().find(u => u.pin === formData.pin);
    if (existingUser) {
      toast({
        title: 'PIN Already Exists',
        description: 'This PIN is already assigned to another user',
        variant: 'destructive',
      });
      return;
    }

    const baseSalary = formData.role === 'employee' && formData.baseSalary 
      ? parseFloat(formData.baseSalary) 
      : undefined;
    
    await store.createUser(formData.name, formData.role, formData.pin, baseSalary);
    toast({
      title: 'Staff Created',
      description: `${formData.name} has been added successfully`,
    });
    setIsCreateDialogOpen(false);
    loadStaff();
  };

  const handleEditSubmit = async () => {
    if (!selectedStaff) return;

    if (!formData.name.trim() || !formData.pin.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive',
      });
      return;
    }

    // Check if PIN already exists (excluding current user)
    const existingUser = store.getAllUsers().find(
      u => u.pin === formData.pin && u.id !== selectedStaff.id
    );
    if (existingUser) {
      toast({
        title: 'PIN Already Exists',
        description: 'This PIN is already assigned to another user',
        variant: 'destructive',
      });
      return;
    }

    const baseSalary = formData.role === 'employee' && formData.baseSalary 
      ? parseFloat(formData.baseSalary) 
      : undefined;
    
    // Check if salary is being changed
    const salaryChanged = selectedStaff.baseSalary !== baseSalary;
    const reason = salaryChanged && formData.salaryChangeReason.trim() 
      ? formData.salaryChangeReason.trim() 
      : undefined;
    
    await store.updateUser(selectedStaff.id, {
      name: formData.name,
      pin: formData.pin,
      role: formData.role,
      baseSalary,
    }, reason);
    
    toast({
      title: 'Staff Updated',
      description: salaryChanged 
        ? `${formData.name}'s salary has been updated and tracked`
        : `${formData.name} has been updated successfully`,
    });
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
    loadStaff();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStaff) return;

    if (selectedStaff.id === user?.id) {
      toast({
        title: 'Cannot Delete',
        description: 'You cannot delete your own account',
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    const success = await store.deleteUser(selectedStaff.id);
    if (success) {
      toast({
        title: 'Staff Deleted',
        description: `${selectedStaff.name} has been removed`,
        variant: 'destructive',
      });
      setSelectedStaff(null);
      loadStaff();
    } else {
      toast({
        title: 'Delete Failed',
        description: 'Unable to delete this staff member',
        variant: 'destructive',
      });
    }
    setIsDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Staff Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your team members and their access
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-shrink-0">
                <RefreshButton onRefresh={loadStaff} />
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial min-w-0">
                <Button onClick={handleCreate} className="w-full sm:w-auto gradient-primary shadow-md hover:shadow-lg text-xs sm:text-sm" size="sm">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Staff</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Staff List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          {staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Staff Members</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first staff member
              </p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-glass-border">
                    <th className="text-left p-2 sm:p-3 md:p-4 font-semibold text-xs sm:text-sm">Name</th>
                    <th className="text-left p-2 sm:p-3 md:p-4 font-semibold text-xs sm:text-sm">Role</th>
                    <th className="text-left p-2 sm:p-3 md:p-4 font-semibold text-xs sm:text-sm hidden sm:table-cell">PIN</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 font-semibold text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember, index) => (
                    <React.Fragment key={staffMember.id}>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-glass-border hover:bg-secondary/30 transition-colors"
                      >
                      <td className="p-2 sm:p-3 md:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            staffMember.role === 'admin'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {staffMember.role === 'admin' ? (
                              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <User className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">{staffMember.name}</p>
                            {staffMember.id === user.id && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">(You)</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4">
                        <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                          staffMember.role === 'admin'
                            ? 'gradient-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {staffMember.role === 'admin' ? 'Administrator' : 'Employee'}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell">
                        <code className="px-2 sm:px-3 py-1 rounded-lg bg-secondary text-xs sm:text-sm font-mono">
                          {staffMember.pin}
                        </code>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4">
                        <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                          {staffMember.role === 'employee' && staffMember.baseSalary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSalaryHistory(showSalaryHistory === staffMember.id ? null : staffMember.id)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              title="View Salary History"
                            >
                              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(staffMember)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          {staffMember.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(staffMember)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    {showSalaryHistory === staffMember.id && staffMember.role === 'employee' && (
                      <tr>
                        <td colSpan={4} className="p-2 sm:p-3 md:p-4 bg-secondary/20">
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Salary History - {staffMember.name}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSalaryHistory(null)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            {(() => {
                              const history = store.getSalaryHistory(staffMember.id);
                              return history.length > 0 ? (
                                <div className="space-y-2">
                                  {history.map((entry) => (
                                    <div key={entry.id} className="p-3 bg-card rounded-lg border border-glass-border">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-medium">
                                              {new Date(entry.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              Changed by: {store.getUserById(entry.changedBy)?.name || 'System'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm">
                                            <span className={entry.oldBaseSalary ? 'text-muted-foreground' : 'text-muted-foreground/50'}>
                                              {entry.oldBaseSalary ? `₹${entry.oldBaseSalary.toLocaleString()}` : 'Not set'}
                                            </span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="font-semibold text-primary">
                                              ₹{entry.newBaseSalary.toLocaleString()}
                                            </span>
                                          </div>
                                          {entry.reason && (
                                            <p className="text-xs text-muted-foreground mt-2 italic">
                                              Reason: {entry.reason}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No salary history available. Salary changes will be tracked here.
                                </p>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff member account. They will use the PIN to log in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-pin">PIN (4 digits)</Label>
                <Input
                  id="create-pin"
                  type="text"
                  placeholder="0000"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 4) {
                      setFormData({ ...formData, pin: value });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: Role) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'employee' && (
                <div className="space-y-2">
                  <Label htmlFor="create-salary">Base Salary (₹) - Optional</Label>
                  <Input
                    id="create-salary"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g., 30000"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set the base monthly salary for this employee. Can be updated later in Salary section.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubmit} className="gradient-primary">
                Create Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff member information. Changes will take effect immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pin">PIN (4 digits)</Label>
                <Input
                  id="edit-pin"
                  type="text"
                  placeholder="0000"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 4) {
                      setFormData({ ...formData, pin: value });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: Role) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'employee' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-salary">Base Salary (₹) - Optional</Label>
                    <Input
                      id="edit-salary"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g., 30000"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Set the base monthly salary for this employee. Can be updated later in Salary section.
                    </p>
                  </div>
                  {selectedStaff && formData.baseSalary !== (selectedStaff.baseSalary?.toString() || '') && (
                    <div className="space-y-2 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                      <Label htmlFor="salary-reason">Reason for Salary Change (Optional)</Label>
                      <Input
                        id="salary-reason"
                        type="text"
                        placeholder="e.g., Annual increment, Performance bonus, Promotion"
                        value={formData.salaryChangeReason}
                        onChange={(e) => setFormData({ ...formData, salaryChangeReason: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        This change will be tracked in the salary history for record keeping.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} className="gradient-primary">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedStaff?.name} and all their associated data
                (attendance, leaves, salaries). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

