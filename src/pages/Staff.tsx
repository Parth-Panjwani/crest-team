import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users, Shield, User } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, User as UserType, Role } from '@/lib/store';
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

export default function Staff() {
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
  });

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

  const loadStaff = () => {
    const allUsers = store.getAllUsers();
    setStaff(allUsers);
  };

  const handleCreate = () => {
    setFormData({ name: '', pin: '', role: 'employee', baseSalary: '' });
    setSelectedStaff(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (staffMember: UserType) => {
    setFormData({
      name: staffMember.name,
      pin: staffMember.pin,
      role: staffMember.role,
      baseSalary: staffMember.baseSalary?.toString() || '',
    });
    setSelectedStaff(staffMember);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (staffMember: UserType) => {
    setSelectedStaff(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateSubmit = () => {
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
    
    store.createUser(formData.name, formData.role, formData.pin, baseSalary);
    toast({
      title: 'Staff Created',
      description: `${formData.name} has been added successfully`,
    });
    setIsCreateDialogOpen(false);
    loadStaff();
  };

  const handleEditSubmit = () => {
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
    
    store.updateUser(selectedStaff.id, {
      name: formData.name,
      pin: formData.pin,
      role: formData.role,
      baseSalary,
    });
    toast({
      title: 'Staff Updated',
      description: `${formData.name} has been updated successfully`,
    });
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
    loadStaff();
  };

  const handleDeleteConfirm = () => {
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

    const success = store.deleteUser(selectedStaff.id);
    if (success) {
      toast({
        title: 'Staff Deleted',
        description: `${selectedStaff.name} has been removed`,
        variant: 'destructive',
      });
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
      <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Staff Management</h1>
              <p className="text-muted-foreground">
                Manage your team members and their access
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleCreate} className="gradient-primary shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </motion.div>
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
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Role</th>
                    <th className="text-left p-4 font-semibold">PIN</th>
                    <th className="text-right p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember, index) => (
                    <motion.tr
                      key={staffMember.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-glass-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            staffMember.role === 'admin'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {staffMember.role === 'admin' ? (
                              <Shield className="w-5 h-5" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{staffMember.name}</p>
                            {staffMember.id === user.id && (
                              <p className="text-xs text-muted-foreground">(You)</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          staffMember.role === 'admin'
                            ? 'gradient-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {staffMember.role === 'admin' ? 'Administrator' : 'Employee'}
                        </span>
                      </td>
                      <td className="p-4">
                        <code className="px-3 py-1 rounded-lg bg-secondary text-sm font-mono">
                          {staffMember.pin}
                        </code>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(staffMember)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {staffMember.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(staffMember)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
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

