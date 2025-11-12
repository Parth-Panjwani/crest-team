import { Router } from 'express';
import { getCollection } from '../models/index.js';
import { formatNotification, type NotificationDocument } from '../models/notifications.js';
import { broadcastDataUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get notifications for a user
router.get('/', async (req, res) => {
  try {
    const { userId, unreadOnly } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const notificationsCollection = await getCollection<NotificationDocument>('notifications');
    const query: any = { targetUserId: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const notifications = await notificationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    res.json(notifications.map(formatNotification));
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notificationsCollection = await getCollection<NotificationDocument>('notifications');
    await notificationsCollection.updateOne({ id }, { $set: { read: true } });
    // Broadcast to all users
    broadcastDataUpdate('notification', { id, read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const notificationsCollection = await getCollection<NotificationDocument>('notifications');
    await notificationsCollection.updateMany(
      { targetUserId: userId, read: false },
      { $set: { read: true } }
    );
    // Broadcast to all users
    broadcastDataUpdate('notification', { userId, allRead: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notificationsCollection = await getCollection<NotificationDocument>('notifications');
    await notificationsCollection.deleteOne({ id });
    // Broadcast to all users
    broadcastDataUpdate('notification', { id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

