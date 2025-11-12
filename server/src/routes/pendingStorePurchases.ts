import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import type { PendingStorePurchaseDocument } from '../models/pendingStorePurchases.js';
import { broadcastDataUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get pending store purchases
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const collection = await getCollection<PendingStorePurchaseDocument>('pendingStorePurchases');
    const query: any = { deducted: { $ne: true } };
    if (typeof userId === 'string') {
      query.userId = userId;
    }
    const purchases = await collection.find(query).sort({ date: -1 }).toArray();
    res.json(purchases);
  } catch (error) {
    console.error('Get pending store purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create pending store purchase
router.post('/', async (req, res) => {
  try {
    const { userId, date, amount, description } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const purchase: PendingStorePurchaseDocument = {
      id: uuidv4(),
      userId,
      date: date || new Date().toISOString(),
      amount: amount || 0,
      description,
      deducted: false,
      createdAt: new Date().toISOString(),
    };
    const collection = await getCollection<PendingStorePurchaseDocument>('pendingStorePurchases');
    await collection.insertOne(purchase);
    // Broadcast to all users
    broadcastDataUpdate('pendingStorePurchase', purchase);
    res.json(purchase);
  } catch (error) {
    console.error('Create pending store purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as deducted
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { salaryId } = req.body;
    const collection = await getCollection<PendingStorePurchaseDocument>('pendingStorePurchases');
    await collection.updateOne(
      { id },
      { $set: { deducted: true, deductedInSalaryId: salaryId } }
    );
    // Broadcast to all users
    broadcastDataUpdate('pendingStorePurchase', { id, deducted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Update pending store purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete pending store purchase
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = await getCollection<PendingStorePurchaseDocument>('pendingStorePurchases');
    await collection.deleteOne({ id });
    // Broadcast to all users
    broadcastDataUpdate('pendingStorePurchase', { id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete pending store purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

