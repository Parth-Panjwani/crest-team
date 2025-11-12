import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatNote, compressNoteText, type NoteDocument } from '../models/notes.js';
import { broadcastNoteUpdate } from '../websocket/broadcast.js';
import { sendPushNotificationToUser } from '../services/notifications.js';

const router = Router();

// Get all notes
router.get('/', async (req, res) => {
  try {
    const { deleted, userId } = req.query;
    const includeDeleted = deleted === 'true';
    const notesCollection = await getCollection<NoteDocument>('notes');
    const query: any = includeDeleted ? { deleted: true } : { deleted: { $ne: true } };
    if (includeDeleted && typeof userId === 'string') {
      query.deletedBy = userId;
    }
    const notes = await notesCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.json(notes.map(formatNote));
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create note
router.post('/', async (req, res) => {
  try {
    const { text, createdBy, category, adminOnly, subCategory, imageUrl } = req.body;
    if (!text || !createdBy) {
      return res.status(400).json({ error: 'text and createdBy are required' });
    }
    const { textCompressed, textLength, textHash } = compressNoteText(text);
    const now = new Date().toISOString();
    const note: NoteDocument = {
      id: uuidv4(),
      textCompressed,
      textLength,
      textHash,
      createdBy,
      createdAt: now,
      status: 'pending',
      category: category || 'general',
      subCategory: category === 'reminder' ? subCategory : undefined,
      adminOnly: adminOnly || false,
      imageUrl: imageUrl || undefined,
    };
    const notesCollection = await getCollection<NoteDocument>('notes');
    await notesCollection.insertOne(note);
    const formatted = formatNote(note);
    
    // Notify all users about new note
    try {
      const usersCollection = await getCollection('users');
      const creator = await usersCollection.findOne({ id: createdBy });
      const allUsers = await usersCollection.find({}).toArray();
      
      if (creator) {
        const notificationTitle = `📝 New ${category === 'reminder' ? 'Reminder' : category === 'order' ? 'Order' : 'Note'}`;
        const notificationBody = `${creator.name} created a new ${category === 'reminder' ? 'reminder' : category === 'order' ? 'order' : 'note'}`;
        
        // Send push notification to all users (except creator)
        allUsers.forEach(user => {
          if (user.id !== createdBy) {
            sendPushNotificationToUser(user.id, notificationTitle, notificationBody, {
              type: 'note',
              noteId: formatted.id,
              category: category || 'general',
            }, 'note').catch(err => {
              console.error('Failed to send push notification:', err);
            });
          }
        });
      }
    } catch (notifError) {
      console.error('Failed to send note notifications:', notifError);
    }
    
    // Broadcast to all users
    broadcastNoteUpdate(formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, status, category, adminOnly, subCategory, imageUrl } = req.body;
    const notesCollection = await getCollection<NoteDocument>('notes');
    const update: Partial<NoteDocument> = {};
    if (status !== undefined) update.status = status;
    if (category !== undefined) {
      update.category = category;
      if (category === 'reminder') {
        update.subCategory = subCategory;
      } else {
        update.subCategory = undefined;
      }
    } else if (subCategory !== undefined) {
      update.subCategory = subCategory;
    }
    if (adminOnly !== undefined) update.adminOnly = adminOnly;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (text !== undefined) {
      const { textCompressed, textLength, textHash } = compressNoteText(text);
      update.textCompressed = textCompressed;
      update.textLength = textLength;
      update.textHash = textHash;
      update.updatedAt = new Date().toISOString();
    }
    await notesCollection.updateOne({ id }, { $set: update, $unset: { text: '' } });
    const note = await notesCollection.findOne({ id });
    if (note) {
      const formatted = formatNote(note);
      broadcastNoteUpdate(formatted);
      res.json(formatted);
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;
    const notesCollection = await getCollection<NoteDocument>('notes');
    if (deletedBy) {
      await notesCollection.updateOne(
        { id },
        { $set: { deleted: true, deletedAt: new Date().toISOString(), deletedBy } }
      );
    } else {
      await notesCollection.deleteOne({ id });
    }
    // Broadcast to all users
    broadcastNoteUpdate({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore note
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const notesCollection = await getCollection<NoteDocument>('notes');
    await notesCollection.updateOne(
      { id },
      { $set: { deleted: false, deletedAt: null, deletedBy: null } }
    );
    const note = await notesCollection.findOne({ id });
    if (note) {
      const formatted = formatNote(note);
      broadcastNoteUpdate(formatted);
      res.json(formatted);
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  } catch (error) {
    console.error('Restore note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

