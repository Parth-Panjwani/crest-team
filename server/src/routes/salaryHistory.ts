import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import type { SalaryHistoryDocument } from '../models/salaryHistory.js';
import { broadcastDataUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get salary history
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const collection = await getCollection<SalaryHistoryDocument>('salaryHistory');
    const query: any = typeof userId === 'string' ? { userId } : {};
    const history = await collection.find(query).sort({ date: -1 }).toArray();
    res.json(history);
  } catch (error) {
    console.error('Get salary history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create salary history entry
router.post('/', async (req, res) => {
  try {
    const { userId, oldBaseSalary, newBaseSalary, changedBy, reason } = req.body;
    if (!userId || newBaseSalary === undefined) {
      return res.status(400).json({ error: 'userId and newBaseSalary are required' });
    }
    const entry: SalaryHistoryDocument = {
      id: uuidv4(),
      userId,
      date: new Date().toISOString(),
      oldBaseSalary: oldBaseSalary ?? null,
      newBaseSalary,
      changedBy: changedBy || 'system',
      reason,
    };
    const collection = await getCollection<SalaryHistoryDocument>('salaryHistory');
    await collection.insertOne(entry);
    // Broadcast to all users
    broadcastDataUpdate('salaryHistory', entry);
    res.json(entry);
  } catch (error) {
    console.error('Create salary history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

