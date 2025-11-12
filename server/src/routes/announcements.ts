import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatAnnouncement, type AnnouncementDocument } from '../models/announcements.js';
import { broadcastAnnouncementUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get all announcements
router.get('/', async (req, res) => {
  try {
    const announcementsCollection = await getCollection<AnnouncementDocument>('announcements');
    const announcements = await announcementsCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.json(announcements.map(formatAnnouncement));
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create announcement
router.post('/', async (req, res) => {
  try {
    const { title, body, expiresAt } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }
    const announcement: AnnouncementDocument = {
      id: uuidv4(),
      title,
      body,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      readBy: [],
    };
    const announcementsCollection = await getCollection<AnnouncementDocument>('announcements');
    await announcementsCollection.insertOne(announcement);
    const formatted = formatAnnouncement(announcement);
    // Broadcast to all users
    broadcastAnnouncementUpdate(formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark announcement as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const announcementsCollection = await getCollection<AnnouncementDocument>('announcements');
    const announcement = await announcementsCollection.findOne({ id });
    if (!announcement) {
      return res.status(404).json({ error: 'Not found' });
    }
    const readBy = Array.isArray(announcement.readBy) ? [...announcement.readBy] : [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await announcementsCollection.updateOne({ id }, { $set: { readBy } });
      // Broadcast to all users
      broadcastAnnouncementUpdate(formatAnnouncement({ ...announcement, readBy }));
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Mark announcement read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

