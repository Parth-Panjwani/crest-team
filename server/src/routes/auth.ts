import { Router } from 'express';
import { getCollection } from '../models/index.js';
import { formatUser } from '../models/users.js';
import type { UserDocument } from '../models/users.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const usersCollection = await getCollection<UserDocument>('users');
    const user = await usersCollection.findOne({ pin });

    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json(formatUser(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

