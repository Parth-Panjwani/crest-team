import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatLeave, type LeaveDocument } from '../models/leaves.js';
import { broadcastLeaveUpdate } from '../websocket/broadcast.js';
import type { SalaryDocument } from '../models/salaries.js';
import type { NotificationDocument } from '../models/notifications.js';
import { broadcastDataUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get all leaves
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const leavesCollection = await getCollection<LeaveDocument>('leaves');
    const query: any = typeof userId === 'string' ? { userId } : {};
    const leaves = await leavesCollection.find(query).sort({ date: -1 }).toArray();
    res.json(leaves.map(formatLeave));
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create leave
router.post('/', async (req, res) => {
  try {
    const { userId, date, type, reason } = req.body;
    if (!userId || !date || !type) {
      return res.status(400).json({ error: 'userId, date and type are required' });
    }
    const leave: LeaveDocument = {
      id: uuidv4(),
      userId,
      date,
      type,
      reason,
      status: 'pending',
    };
    const leavesCollection = await getCollection<LeaveDocument>('leaves');
    await leavesCollection.insertOne(leave);
    
    // Notify admins about new leave request
    try {
      const usersCollection = await getCollection('users');
      const user = await usersCollection.findOne({ id: userId });
      const admins = await usersCollection.find({ role: 'admin' }).toArray();
      
      if (user && admins.length > 0) {
        const notificationsCollection = await getCollection<NotificationDocument>('notifications');
        const notificationPromises = admins.map(admin => {
          const notification: NotificationDocument = {
            id: uuidv4(),
            type: 'leave',
            title: '📅 New Leave Request',
            message: `${user.name} requested ${type === 'full' ? 'full day' : 'half day'} leave on ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            userId,
            targetUserId: admin.id,
            read: false,
            createdAt: new Date().toISOString(),
            data: {
              type: 'leaveRequest',
              leaveId: leave.id,
              date,
              leaveType: type,
            },
          };
          return notificationsCollection.insertOne(notification);
        });
        await Promise.all(notificationPromises);
        
        // Broadcast notification to admins
        admins.forEach(admin => {
          broadcastDataUpdate('notification', {
            type: 'leave',
            title: '📅 New Leave Request',
            message: `${user.name} requested leave`,
          }, admin.id);
        });
      }
    } catch (notifError) {
      console.error('Failed to create leave notification:', notifError);
      // Don't fail the leave creation if notification fails
    }
    
    const formatted = formatLeave(leave);
    broadcastLeaveUpdate(formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update leave status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, salaryDeduction, approvedBy } = req.body;
    
    // Ensure salaryDeduction is a boolean, not undefined
    const shouldDeductSalary = salaryDeduction === true || salaryDeduction === 'true';
    const leavesCollection = await getCollection<LeaveDocument>('leaves');
    const leave = await leavesCollection.findOne({ id });
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    const update: any = {};
    if (status !== undefined) {
      update.status = status;
      if (status === 'approved' || status === 'rejected') {
        update.approvedAt = new Date().toISOString();
        if (approvedBy) {
          update.approvedBy = approvedBy;
        }
      }
    }
    if (status === 'approved') {
      update.salaryDeduction = shouldDeductSalary;
    }

    await leavesCollection.updateOne({ id }, { $set: update });
    const updated = await leavesCollection.findOne({ id });
    
    if (updated) {
      // If leave is approved with salary deduction, update salary
      if (updated.status === 'approved' && shouldDeductSalary) {
        try {
          const usersCollection = await getCollection('users');
          const user = await usersCollection.findOne({ id: updated.userId });
          
          if (user && user.baseSalary) {
            // Get the month for the leave date
            const leaveDate = new Date(updated.date);
            const month = `${leaveDate.getFullYear()}-${String(leaveDate.getMonth() + 1).padStart(2, '0')}`;
            
            const salariesCollection = await getCollection<SalaryDocument>('salaries');
            let salary = await salariesCollection.findOne({ userId: updated.userId, month });
            
            // Calculate deduction amount (full day = full day salary, half day = half day salary)
            const dailySalary = user.baseSalary / 30; // Assuming 30 days per month
            const deductionAmount = updated.type === 'full' ? dailySalary : dailySalary / 2;
            
            if (salary) {
              // Update existing salary
              const currentDeductions = salary.totalDeductions || 0;
              const currentFinalPay = salary.finalPay || salary.calcPay || 0;
              
              await salariesCollection.updateOne(
                { id: salary.id },
                {
                  $set: {
                    totalDeductions: currentDeductions + deductionAmount,
                    finalPay: currentFinalPay - deductionAmount,
                  },
                }
              );
            } else {
              // Create new salary record if it doesn't exist
              const newSalary: SalaryDocument = {
                id: uuidv4(),
                userId: updated.userId,
                month,
                type: 'fixed',
                base: user.baseSalary,
                hours: 0,
                calcPay: user.baseSalary,
                adjustments: 0,
                advances: [],
                storePurchases: [],
                totalDeductions: deductionAmount,
                finalPay: user.baseSalary - deductionAmount,
                paid: false,
              };
              await salariesCollection.insertOne(newSalary);
            }

            // Notify the employee about salary deduction
            const notificationsCollection = await getCollection<NotificationDocument>('notifications');
            const notification: NotificationDocument = {
              id: uuidv4(),
              type: 'salary',
              title: 'Salary Deduction for Leave',
              message: `₹${deductionAmount.toFixed(2)} has been deducted from your salary for ${updated.type === 'full' ? 'full day' : 'half day'} leave on ${new Date(updated.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              userId: updated.userId,
              targetUserId: updated.userId,
              read: false,
              createdAt: new Date().toISOString(),
              data: {
                type: 'leaveDeduction',
                leaveId: updated.id,
                amount: deductionAmount,
                date: updated.date,
              },
            };
            await notificationsCollection.insertOne(notification);
            
            // Broadcast notification to employee
            broadcastDataUpdate('notification', {
              type: 'salary',
              title: 'Salary Deduction for Leave',
              message: `₹${deductionAmount.toFixed(2)} deducted for leave`,
            }, updated.userId);
          }
        } catch (salaryError) {
          console.error('Failed to update salary for leave deduction:', salaryError);
          // Don't fail the leave update if salary update fails
        }
      }

      const formatted = formatLeave(updated);
      // Broadcast to all users
      broadcastLeaveUpdate(formatted);
      res.json(formatted);
    } else {
      res.status(404).json({ error: 'Leave not found' });
    }
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete leave
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const leavesCollection = await getCollection<LeaveDocument>('leaves');
    await leavesCollection.deleteOne({ id });
    // Broadcast to all users
    broadcastLeaveUpdate({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

