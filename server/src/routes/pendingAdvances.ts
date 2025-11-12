import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import type { PendingAdvanceDocument } from '../models/pendingAdvances.js';

const router = Router();

// Get pending advances
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const collection = await getCollection<PendingAdvanceDocument>('pendingAdvances');
    const query: any = { deducted: { $ne: true } };
    if (typeof userId === 'string') {
      query.userId = userId;
    }
    const advances = await collection.find(query).sort({ date: -1 }).toArray();
    res.json(advances);
  } catch (error) {
    console.error('Get pending advances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create pending advance
router.post('/', async (req, res) => {
  try {
    const { userId, date, amount, description } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const advance: PendingAdvanceDocument = {
      id: uuidv4(),
      userId,
      date: date || new Date().toISOString(),
      amount: amount || 0,
      description,
      deducted: false,
      createdAt: new Date().toISOString(),
    };
    const collection = await getCollection<PendingAdvanceDocument>('pendingAdvances');
    await collection.insertOne(advance);
    // Broadcast to all users
    broadcastDataUpdate('pendingAdvance', advance);
    res.json(advance);
  } catch (error) {
    console.error('Create pending advance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as deducted
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { salaryId } = req.body;
    const collection = await getCollection<PendingAdvanceDocument>('pendingAdvances');
    await collection.updateOne(
      { id },
      { $set: { deducted: true, deductedInSalaryId: salaryId } }
    );
    // Broadcast to all users
    broadcastDataUpdate('pendingAdvance', { id, deducted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Update pending advance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete pending advance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = await getCollection<PendingAdvanceDocument>('pendingAdvances');
    await collection.deleteOne({ id });
    // Broadcast to all users
    broadcastDataUpdate('pendingAdvance', { id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete pending advance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

