import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatLateApproval, type LateApprovalDocument } from '../models/lateApprovals.js';
import { formatAttendance } from '../models/attendance.js';
import { broadcastDataUpdate, broadcastAttendanceUpdate } from '../websocket/broadcast.js';
import type { NotificationDocument } from '../models/notifications.js';

const router = Router();

// Get pending approvals (admin)
router.get('/pending', async (req, res) => {
  try {
    const approvalsCollection = await getCollection<LateApprovalDocument>('lateApprovals');
    const approvals = await approvalsCollection
      .find({ status: 'pending' })
      .sort({ requestedAt: -1 })
      .toArray();
    
    res.json(approvals.map(formatLateApproval));
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get approvals for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const approvalsCollection = await getCollection<LateApprovalDocument>('lateApprovals');
    const approvals = await approvalsCollection
      .find({ userId })
      .sort({ date: -1 })
      .limit(50)
      .toArray();
    
    res.json(approvals.map(formatLateApproval));
  } catch (error) {
    console.error('Get user approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get approval by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const approvalsCollection = await getCollection<LateApprovalDocument>('lateApprovals');
    const approval = await approvalsCollection.findOne({ id });
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    res.json(formatLateApproval(approval));
  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject late arrival
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, rejectionReason, adminNotes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const approvalsCollection = await getCollection<LateApprovalDocument>('lateApprovals');
    const approval = await approvalsCollection.findOne({ id });
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const update: any = {
      status,
      approvedAt: new Date().toISOString(),
    };

    if (approvedBy) {
      update.approvedBy = approvedBy;
    }
    if (rejectionReason) {
      update.rejectionReason = rejectionReason;
    }
    if (adminNotes) {
      update.adminNotes = adminNotes;
    }

    await approvalsCollection.updateOne({ id }, { $set: update });
    
    const updated = await approvalsCollection.findOne({ id });
    if (updated) {
      // If approved, update the attendance record to remove lateApprovalId requirement
      if (status === 'approved') {
        try {
          const attendanceCollection = await getCollection('attendance');
          const attendance = await attendanceCollection.findOne({ id: approval.attendanceId });
          if (attendance) {
            // Update the punch to remove lateApprovalId (or we can keep it but mark as approved)
            // For now, we'll keep it but the UI should check approval status
            // Actually, let's update the punch to reflect approval status
            const updatedPunches = attendance.punches.map((punch: any) => {
              if (punch.lateApprovalId === id) {
                return { ...punch, lateApprovalStatus: 'approved' };
              }
              return punch;
            });
            // Update attendance with new punches
            const updatedAttendance = {
              ...attendance,
              punches: updatedPunches
            };
            
            await attendanceCollection.updateOne(
              { id: approval.attendanceId },
              { $set: { punches: updatedPunches } }
            );
            
            // Broadcast attendance update with updated punches
            const formattedAttendance = formatAttendance(updatedAttendance);
            broadcastAttendanceUpdate(formattedAttendance);
          }
        } catch (attError) {
          console.error('Failed to update attendance after approval:', attError);
          // Don't fail the approval if attendance update fails
        }
      }
      
      // Broadcast lateApproval update to all users
      broadcastDataUpdate('lateApproval', formatLateApproval(updated));
      
      // Update and broadcast notification updates
      const notificationsCollection = await getCollection<NotificationDocument>('notifications');
      const updatedNotifications = await notificationsCollection.updateMany(
        { 'data.approvalId': id },
        { $set: { read: true } }
      );
      
      // Broadcast notification update for all affected notifications
      if (updatedNotifications.modifiedCount > 0) {
        const affectedNotifications = await notificationsCollection
          .find({ 'data.approvalId': id })
          .toArray();
        affectedNotifications.forEach(notif => {
          broadcastDataUpdate('notification', {
            id: notif.id,
            read: true,
            userId: notif.userId,
            targetUserId: notif.targetUserId
          });
        });
      }

      res.json(formatLateApproval(updated));
    } else {
      res.status(500).json({ error: 'Failed to update approval' });
    }
  } catch (error) {
    console.error('Update approval status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

