import { Router } from 'express';
import { getCollection } from '../models/index.js';

const router = Router();

/**
 * Save/update FCM token for a user
 * POST /api/fcm/token
 * Body: { userId: string, token: string }
 */
router.post('/token', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    const usersCollection = await getCollection('users');
    await usersCollection.updateOne(
      { id: userId },
      { $set: { fcmToken: token } }
    );

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Remove FCM token for a user
 * DELETE /api/fcm/token
 * Body: { userId: string }
 */
router.delete('/token', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const usersCollection = await getCollection('users');
    await usersCollection.updateOne(
      { id: userId },
      { $unset: { fcmToken: '' } }
    );

    res.json({ success: true, message: 'FCM token removed' });
  } catch (error) {
    console.error('Remove FCM token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


