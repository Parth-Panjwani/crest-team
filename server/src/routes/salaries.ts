import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatSalary, type SalaryDocument } from '../models/salaries.js';
import { broadcastSalaryUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get salaries
router.get('/', async (req, res) => {
  try {
    const { userId, month } = req.query;
    const salariesCollection = await getCollection<SalaryDocument>('salaries');
    const query: any = {};
    if (typeof userId === 'string') query.userId = userId;
    if (typeof month === 'string') query.month = month;
    const salaries = await salariesCollection.find(query).sort({ month: -1 }).toArray();
    res.json(salaries.map(formatSalary));
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create salary
router.post('/', async (req, res) => {
  try {
    const salaryData = req.body;
    if (!salaryData.userId || !salaryData.month) {
      return res.status(400).json({ error: 'userId and month are required' });
    }
    const salary: SalaryDocument = {
      id: uuidv4(),
      userId: salaryData.userId,
      month: salaryData.month,
      type: salaryData.type,
      base: salaryData.base,
      hours: salaryData.hours,
      calcPay: salaryData.calcPay,
      adjustments: salaryData.adjustments,
      advances: salaryData.advances,
      storePurchases: salaryData.storePurchases,
      totalDeductions: salaryData.totalDeductions,
      finalPay: salaryData.finalPay,
      paid: salaryData.paid,
      paidDate: salaryData.paidDate,
      note: salaryData.note,
    };
    const salariesCollection = await getCollection<SalaryDocument>('salaries');
    await salariesCollection.insertOne(salary);
    const formatted = formatSalary(salary);
    // Broadcast to all users
    broadcastSalaryUpdate(formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Create salary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update salary
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const salariesCollection = await getCollection<SalaryDocument>('salaries');
    await salariesCollection.updateOne({ id }, { $set: updates });
    const salary = await salariesCollection.findOne({ id });
    if (salary) {
      const formatted = formatSalary(salary);
      // Broadcast to all users
      broadcastSalaryUpdate(formatted);
      res.json(formatted);
    } else {
      res.status(404).json({ error: 'Salary not found' });
    }
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete salary
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const salariesCollection = await getCollection<SalaryDocument>('salaries');
    await salariesCollection.deleteOne({ id });
    // Broadcast to all users
    broadcastSalaryUpdate({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

