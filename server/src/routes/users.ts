import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatUser, type UserDocument } from '../models/users.js';
import { broadcastUserUpdate } from '../websocket/broadcast.js';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const usersCollection = await getCollection<UserDocument>('users');
    const users = await usersCollection.find({}).toArray();
    res.json(users.map(formatUser));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usersCollection = await getCollection<UserDocument>('users');
    const user = await usersCollection.findOne({ id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatUser(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { name, role, pin, baseSalary } = req.body;
    if (!name || !role || !pin) {
      return res.status(400).json({ error: 'name, role and pin are required' });
    }
    const usersCollection = await getCollection<UserDocument>('users');
    const user: UserDocument = {
      id: uuidv4(),
      name,
      role,
      pin,
      baseSalary: baseSalary ?? null,
    };
    await usersCollection.insertOne(user);
    // Broadcast to all users
    broadcastUserUpdate(formatUser(user));
    res.json(formatUser(user));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, pin, baseSalary } = req.body;
    const usersCollection = await getCollection<UserDocument>('users');
    const updates: Partial<UserDocument> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (pin !== undefined) updates.pin = pin;
    if (baseSalary !== undefined) updates.baseSalary = baseSalary;
    await usersCollection.updateOne({ id }, { $set: updates });
    const user = await usersCollection.findOne({ id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Broadcast to all users
    broadcastUserUpdate(formatUser(user));
    res.json(formatUser(user));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usersCollection = await getCollection<UserDocument>('users');
    await usersCollection.deleteOne({ id });
    // Also delete related data
    await Promise.all([
      getCollection('attendance').then(c => c.deleteMany({ userId: id })),
      getCollection('notes').then(c => c.deleteMany({ createdBy: id })),
      getCollection('leaves').then(c => c.deleteMany({ userId: id })),
      getCollection('salaries').then(c => c.deleteMany({ userId: id })),
    ]);
    // Broadcast to all users
    broadcastUserUpdate({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

