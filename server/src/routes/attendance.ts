import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatAttendance, type AttendanceDocument, type AttendancePunch, AttendancePunchType } from '../models/attendance.js';
import { broadcastAttendanceUpdate } from '../websocket/broadcast.js';
import { getPunchStatus, formatMinutes } from '../utils/punchStatus.js';
import type { NotificationDocument } from '../models/notifications.js';
import { broadcastDataUpdate } from '../websocket/broadcast.js';
import type { LateApprovalDocument } from '../models/lateApprovals.js';
import type { LatePermissionDocument } from '../models/latePermissions.js';
import { sendPushNotificationToUser } from '../services/notifications.js';

const router = Router();

function calculateTotals(punches: AttendancePunch[]): { workMin: number; breakMin: number } {
  let workMin = 0;
  let breakMin = 0;
  let lastIn: number | null = null;
  let lastBreakStart: number | null = null;
  const now = Date.now();

  for (const punch of punches) {
    const punchTime = new Date(punch.at).getTime();
    switch (punch.type) {
      case 'IN':
        lastIn = punchTime;
        break;
      case 'OUT':
        if (lastIn) {
          workMin += (punchTime - lastIn) / 60000;
          lastIn = null;
        }
        break;
      case 'BREAK_START':
        if (lastIn) {
          workMin += (punchTime - lastIn) / 60000;
          lastBreakStart = punchTime;
          lastIn = null;
        }
        break;
      case 'BREAK_END':
        if (lastBreakStart) {
          breakMin += (punchTime - lastBreakStart) / 60000;
          lastIn = punchTime;
          lastBreakStart = null;
        }
        break;
    }
  }

  if (lastIn) {
    workMin += (now - lastIn) / 60000;
  }

  return {
    workMin: Math.round(workMin),
    breakMin: Math.round(breakMin),
  };
}

// Punch attendance
router.post('/punch', async (req, res) => {
  try {
    const { userId, type, manualPunch, punchedBy, reason, customTime, remotePunch, location, selfieUrl } = req.body;
    if (!userId || !type) {
      return res.status(400).json({ error: 'userId and type are required' });
    }

    const punchDate = customTime
      ? new Date(customTime).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const punchTime = customTime ? new Date(customTime) : new Date();

    const attendanceCollection = await getCollection<AttendanceDocument>('attendance');
    let attendance = await attendanceCollection.findOne({ userId, date: punchDate });

    let attendanceId: string;
    let currentAttendance: AttendanceDocument;
    if (!attendance) {
      attendanceId = uuidv4();
      const newAttendance: AttendanceDocument = {
        id: attendanceId,
        userId,
        date: punchDate,
        punches: [],
        totals: { workMin: 0, breakMin: 0 },
      };
      await attendanceCollection.insertOne(newAttendance);
      currentAttendance = newAttendance;
    } else {
      attendanceId = attendance.id;
      currentAttendance = attendance;
    }

    const currentPunches = Array.isArray(currentAttendance.punches) 
      ? currentAttendance.punches 
      : typeof currentAttendance.punches === 'string' 
        ? JSON.parse(currentAttendance.punches) 
        : [];

    // Calculate punch status for IN and OUT punches
    let punchStatus: { status?: 'on-time' | 'late' | 'early' | 'overtime'; statusMessage?: string } = {};
    let lateByMinutes = 0;
    if (type === 'IN' || type === 'OUT') {
      const checkInPunch = currentPunches.find(p => p.type === 'IN');
      const checkInTime = checkInPunch ? new Date(checkInPunch.at) : type === 'OUT' ? undefined : punchTime;
      const statusInfo = getPunchStatus(type, punchTime, checkInTime);
      if (statusInfo.status) {
        punchStatus = {
          status: statusInfo.status,
          statusMessage: statusInfo.message,
        };
        if (statusInfo.minutesDiff) {
          lateByMinutes = statusInfo.minutesDiff;
        }
      }
    }

    const newPunch: AttendancePunch = {
      at: punchTime.toISOString(),
      type: type as AttendancePunchType,
      ...punchStatus,
    };

    if (manualPunch) {
      newPunch.manualPunch = true;
      if (punchedBy) newPunch.punchedBy = punchedBy;
      if (reason) newPunch.reason = reason;
    }

    if (remotePunch) {
      newPunch.remotePunch = true;
    }

    if (location) {
      newPunch.location = location;
    }

    // Store reason for break punches or remote check-ins
    if ((type === 'BREAK_START' || type === 'BREAK_END' || remotePunch) && reason) {
      newPunch.reason = reason;
    }

    // Add selfieUrl if provided
    if (selfieUrl) {
      newPunch.selfieUrl = selfieUrl;
      console.log('[Server] ✅ Adding selfieUrl to newPunch:', selfieUrl);
    }

    // If this is a late check-in, check for permission and create approval if needed
    let lateApprovalId: string | undefined;
    if (type === 'IN' && punchStatus.status === 'late' && lateByMinutes > 0) {
      try {
        const latePermissionsCollection = await getCollection<LatePermissionDocument>('latePermissions');
        const permission = await latePermissionsCollection.findOne({
          userId,
          date: punchDate,
          status: 'approved',
        });

        const lateApprovalsCollection = await getCollection<LateApprovalDocument>('lateApprovals');
        const approval: LateApprovalDocument = {
          id: uuidv4(),
          userId,
          attendanceId,
          punchId: newPunch.at, // Use punch time as temporary ID, will be updated
          date: punchDate,
          punchTime: punchTime.toISOString(),
          lateByMinutes,
          hasPermission: !!permission,
          permissionId: permission?.id,
          status: permission ? 'approved' : 'pending', // Auto-approve if permission exists
          requestedAt: new Date().toISOString(),
        };
        await lateApprovalsCollection.insertOne(approval);
        lateApprovalId = approval.id;
        newPunch.lateApprovalId = approval.id;

        // If no permission, notify admins for approval
        if (!permission) {
          const usersCollection = await getCollection('users');
          const user = await usersCollection.findOne({ id: userId });
          const admins = await usersCollection.find({ role: 'admin' }).toArray();

          if (user && admins.length > 0) {
            const notificationsCollection = await getCollection<NotificationDocument>('notifications');
            const notificationPromises = admins.map(admin => {
              const notification: NotificationDocument = {
                id: uuidv4(),
                type: 'punch',
                title: `⚠️ Late Arrival - Approval Required`,
                message: `${user.name} arrived ${formatMinutes(lateByMinutes)} late and needs approval`,
                userId,
                targetUserId: admin.id,
                read: false,
                createdAt: new Date().toISOString(),
                data: {
                  type: 'lateApproval',
                  approvalId: approval.id,
                  attendanceId,
                  lateByMinutes,
                },
              };
              return notificationsCollection.insertOne(notification);
            });
            await Promise.all(notificationPromises);

            admins.forEach(admin => {
              broadcastDataUpdate('notification', {
                type: 'lateApproval',
                title: `⚠️ Late Arrival - Approval Required`,
                message: `${user.name} arrived late and needs approval`,
              }, admin.id);
            });
          }
        }
      } catch (approvalError) {
        console.error('Failed to create late approval:', approvalError);
        // Don't fail the punch if approval creation fails
      }
    }

    // Add approval ID to punch if it was created
    if (lateApprovalId) {
      newPunch.lateApprovalId = lateApprovalId;
    }

    const punches = [...currentPunches, newPunch];
    const totals = calculateTotals(punches);

    // Create notification for admins when staff punches (IN/OUT/BREAK_START/BREAK_END, not manual punches by admin)
    if ((type === 'IN' || type === 'OUT' || type === 'BREAK_START' || type === 'BREAK_END') && !manualPunch) {
      try {
        const usersCollection = await getCollection('users');
        const user = await usersCollection.findOne({ id: userId });
        const admins = await usersCollection.find({ role: 'admin' }).toArray();
        
        if (user && admins.length > 0) {
          const notificationsCollection = await getCollection<NotificationDocument>('notifications');
          const notificationPromises = admins.map(admin => {
            let title = '';
            let message = '';
            if (type === 'IN') {
              title = `${user.name} checked in`;
              message = `${user.name} checked in at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${punchStatus.statusMessage ? ` - ${punchStatus.statusMessage}` : ''}`;
            } else if (type === 'OUT') {
              title = `${user.name} checked out`;
              message = `${user.name} checked out at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${punchStatus.statusMessage ? ` - ${punchStatus.statusMessage}` : ''}`;
            } else if (type === 'BREAK_START') {
              title = `☕ ${user.name} started break`;
              message = `${user.name} started break at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${reason ? ` - Reason: ${reason}` : ''}`;
            } else if (type === 'BREAK_END') {
              title = `✅ ${user.name} ended break`;
              message = `${user.name} ended break at ${punchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            }
            
            const notification: NotificationDocument = {
              id: uuidv4(),
              type: 'punch',
              title,
              message,
              userId,
              targetUserId: admin.id,
              read: false,
              createdAt: new Date().toISOString(),
              data: {
                attendanceId: attendanceId,
                punchType: type,
                punchTime: punchTime.toISOString(),
                status: punchStatus.status,
                reason: reason || undefined,
              },
            };
            return notificationsCollection.insertOne(notification);
          });
          await Promise.all(notificationPromises);
          
          // Broadcast notification to admins
          admins.forEach(admin => {
            broadcastDataUpdate('notification', {
              type: 'punch',
              title,
              message,
            }, admin.id);
            
            // Send push notification
            sendPushNotificationToUser(admin.id, title, message, {
              type: 'punch',
              attendanceId: attendanceId,
              punchType: type,
              userId,
            }, 'punch').catch(err => {
              console.error('Failed to send push notification:', err);
            });
          });
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the punch if notification fails
      }
    }

    await attendanceCollection.updateOne(
      { id: attendanceId },
      { $set: { punches, totals } }
    );

    const updated = await attendanceCollection.findOne({ id: attendanceId });
    if (updated) {
      const formatted = formatAttendance(updated);
      // Broadcast to all users so everyone sees the update
      broadcastAttendanceUpdate(formatted);
      res.json(formatted);
    } else {
      res.status(500).json({ error: 'Failed to update attendance' });
    }
  } catch (error) {
    console.error('Punch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's attendance
router.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const attendanceCollection = await getCollection<AttendanceDocument>('attendance');
    const attendance = await attendanceCollection.findOne({ userId, date: today });
    res.json(attendance ? formatAttendance(attendance) : null);
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;
    const attendanceCollection = await getCollection<AttendanceDocument>('attendance');
    const attendances = await attendanceCollection
      .find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
    res.json(attendances.map(formatAttendance));
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all attendance (admin)
router.get('/all', async (req, res) => {
  try {
    const attendanceCollection = await getCollection<AttendanceDocument>('attendance');
    const attendances = await attendanceCollection.find({}).sort({ date: -1 }).toArray();
    res.json(attendances.map(formatAttendance));
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all attendance records (admin only)
router.delete('/clear', async (req, res) => {
  try {
    const { adminId } = req.body;
    
    // Verify admin
    if (adminId) {
      const usersCollection = await getCollection('users');
      const admin = await usersCollection.findOne({ id: adminId, role: 'admin' });
      if (!admin) {
        return res.status(403).json({ error: 'Only admins can clear attendance records' });
      }
    }

    const attendanceCollection = await getCollection<AttendanceDocument>('attendance');
    const result = await attendanceCollection.deleteMany({});
    
    // Broadcast that all attendance was cleared
    broadcastDataUpdate('attendance', { cleared: true });
    
    res.json({ 
      message: 'All attendance records cleared successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Clear attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

