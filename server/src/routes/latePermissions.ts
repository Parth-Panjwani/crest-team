import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatLatePermission, type LatePermissionDocument } from '../models/latePermissions.js';
import { broadcastDataUpdate } from '../websocket/broadcast.js';

const router = Router();

// Request late arrival permission
router.post('/', async (req, res) => {
  try {
    const { userId, date, reason, expectedArrivalTime } = req.body;
    if (!userId || !date || !reason) {
      return res.status(400).json({ error: 'userId, date, and reason are required' });
    }

    const permissionsCollection = await getCollection<LatePermissionDocument>('latePermissions');
    
    // Check if permission already exists for this date
    const existing = await permissionsCollection.findOne({ userId, date });
    if (existing) {
      return res.status(400).json({ error: 'Permission already requested for this date' });
    }

    const permission: LatePermissionDocument = {
      id: uuidv4(),
      userId,
      date,
      requestedAt: new Date().toISOString(),
      reason,
      expectedArrivalTime,
      status: 'pending',
    };

    await permissionsCollection.insertOne(permission);

    // Notify admins
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ id: userId });
    const admins = await usersCollection.find({ role: 'admin' }).toArray();

    if (user && admins.length > 0) {
      const notificationsCollection = await getCollection('notifications');
      const notificationPromises = admins.map(admin => {
        return notificationsCollection.insertOne({
          id: uuidv4(),
          type: 'punch',
          title: 'Late Arrival Permission Requested',
          message: `${user.name} requested permission to arrive late on ${new Date(date).toLocaleDateString()}`,
          userId,
          targetUserId: admin.id,
          read: false,
          createdAt: new Date().toISOString(),
          data: {
            type: 'latePermission',
            permissionId: permission.id,
            date,
          },
        });
      });
      await Promise.all(notificationPromises);

      // Broadcast to all users
      admins.forEach(admin => {
        broadcastDataUpdate('notification', {
          type: 'latePermission',
          title: 'Late Arrival Permission Requested',
          message: `${user.name} requested permission to arrive late`,
        });
      });
      // Also broadcast permission update
      broadcastDataUpdate('latePermission', formatLatePermission(permission));
    }

    res.json(formatLatePermission(permission));
  } catch (error) {
    console.error('Create late permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get permissions for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, date } = req.query;
    
    const permissionsCollection = await getCollection<LatePermissionDocument>('latePermissions');
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    if (date) {
      query.date = date;
    }
    
    const permissions = await permissionsCollection
      .find(query)
      .sort({ date: -1 })
      .toArray();
    
    res.json(permissions.map(formatLatePermission));
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all pending permissions (admin)
router.get('/pending', async (req, res) => {
  try {
    const permissionsCollection = await getCollection<LatePermissionDocument>('latePermissions');
    const permissions = await permissionsCollection
      .find({ status: 'pending' })
      .sort({ requestedAt: -1 })
      .toArray();
    
    res.json(permissions.map(formatLatePermission));
  } catch (error) {
    console.error('Get pending permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject permission
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, rejectionReason } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const permissionsCollection = await getCollection<LatePermissionDocument>('latePermissions');
    const update: any = {
      status,
      approvedAt: new Date().toISOString(),
    };

    if (approvedBy) {
      update.approvedBy = approvedBy;
    }
    if (status === 'rejected' && rejectionReason) {
      update.rejectionReason = rejectionReason;
    }

    await permissionsCollection.updateOne({ id }, { $set: update });
    
    const permission = await permissionsCollection.findOne({ id });
    if (permission) {
      // Broadcast to all users
      broadcastDataUpdate('latePermission', formatLatePermission(permission));
      res.json(formatLatePermission(permission));
    } else {
      res.status(404).json({ error: 'Permission not found' });
    }
  } catch (error) {
    console.error('Update permission status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

