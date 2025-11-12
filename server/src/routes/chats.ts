import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../models/index.js';
import { formatChatMessage, formatChat, type ChatMessageDocument, type ChatDocument, type FileAttachment } from '../models/chats.js';
import { broadcastChatMessage } from '../websocket/broadcast.js';
import { sendPushNotificationToUser } from '../services/notifications.js';

const router = Router();

/**
 * Get the group chat (single chat for all users)
 * GET /api/chats?userId=xxx
 * Returns the single group chat
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const usersCollection = await getCollection('users');
    const chatsCollection = await getCollection<ChatDocument>('chats');
    const chatMessagesCollection = await getCollection<ChatMessageDocument>('chatMessages');
    
    const user = await usersCollection.findOne({ id: userId as string });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create the single group chat
    const GROUP_CHAT_ID = 'group-chat-all';
    let groupChat = await chatsCollection.findOne({ id: GROUP_CHAT_ID });
    
    if (!groupChat) {
      // Get all users for the group
      const allUsers = await usersCollection.find({}).toArray();
      const participantIds = allUsers.map(u => u.id);
      
      groupChat = {
        id: GROUP_CHAT_ID,
        type: 'group',
        participantIds,
        createdAt: new Date().toISOString(),
      };
      await chatsCollection.insertOne(groupChat);
    } else {
      // Ensure current user is in the group
      if (!groupChat.participantIds.includes(userId as string)) {
        await chatsCollection.updateOne(
          { id: GROUP_CHAT_ID },
          { $addToSet: { participantIds: userId as string } }
        );
        groupChat.participantIds.push(userId as string);
      }
    }

    // Get last message
    const lastMessage = await chatMessagesCollection
      .find({ chatId: GROUP_CHAT_ID })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    
    // Get unread count (messages not read by this user)
    const unreadCount = await chatMessagesCollection.countDocuments({
      chatId: GROUP_CHAT_ID,
      readBy: { $ne: userId as string },
      senderId: { $ne: userId as string }, // Don't count own messages
    });

    const enriched: any = formatChat(groupChat);
    if (lastMessage.length > 0) {
      const formattedMsg = formatChatMessage(lastMessage[0]);
      // Enrich with sender info
      const sender = await usersCollection.findOne({ id: lastMessage[0].senderId });
      if (sender) {
        formattedMsg.sender = {
          id: sender.id,
          name: sender.name,
          role: sender.role,
        };
      }
      enriched.lastMessage = formattedMsg;
    } else {
      enriched.lastMessage = undefined;
    }
    enriched.unreadCount = unreadCount;
    enriched.participantCount = groupChat.participantIds.length;

    res.json([enriched]);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get message history for a chat
 * GET /api/chats/:chatId/messages?limit=50&before=timestamp
 */
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const before = req.query.before as string;

    const chatMessagesCollection = await getCollection<ChatMessageDocument>('chatMessages');
    const usersCollection = await getCollection('users');
    
    let query: any = { chatId };
    if (before) {
      query.createdAt = { $lt: before };
    }

    const messages = await chatMessagesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Reverse to get chronological order
    messages.reverse();

    // Enrich messages with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const formatted = formatChatMessage(msg);
        const sender = await usersCollection.findOne({ id: msg.senderId });
        if (sender) {
          formatted.sender = {
            id: sender.id,
            name: sender.name,
            role: sender.role,
          };
        }
        return formatted;
      })
    );

    res.json(enrichedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Parse mentions from message text (@name format)
 * Supports @FirstName, @FirstName LastName, @firstname, etc.
 */
function parseMentions(message: string, allUsers: Array<{ id: string; name: string }>): string[] {
  const mentions: string[] = [];
  // Match @ followed by word characters (allows spaces and common characters)
  const mentionRegex = /@([\w\s]+?)(?=\s|$|@|,|\.|!|\?)/g;
  let match;
  
  while ((match = mentionRegex.exec(message)) !== null) {
    const mentionedName = match[1].trim().toLowerCase();
    if (!mentionedName) continue;
    
    // Try exact match first
    let user = allUsers.find(u => u.name.toLowerCase() === mentionedName);
    
    // Try partial match (first name only)
    if (!user) {
      user = allUsers.find(u => {
        const firstName = u.name.split(' ')[0].toLowerCase();
        return firstName === mentionedName;
      });
    }
    
    // Try case-insensitive contains match
    if (!user) {
      user = allUsers.find(u => 
        u.name.toLowerCase().includes(mentionedName) || 
        mentionedName.includes(u.name.toLowerCase().split(' ')[0])
      );
    }
    
    if (user) {
      mentions.push(user.id);
    }
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Send a message to group chat
 * POST /api/chats/:chatId/messages
 * Body: { senderId: string, message: string, attachments?: FileAttachment[], mentions?: string[] }
 */
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, message, attachments, mentions: providedMentions, replyTo } = req.body;

    if (!senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }

    // Allow empty message if attachments are present
    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'message or attachments are required' });
    }

    const usersCollection = await getCollection('users');
    const chatsCollection = await getCollection<ChatDocument>('chats');
    const chatMessagesCollection = await getCollection<ChatMessageDocument>('chatMessages');

    // Verify chat exists
    const chat = await chatsCollection.findOne({ id: chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify sender is a participant
    if (!chat.participantIds.includes(senderId)) {
      return res.status(403).json({ error: 'User is not a participant in this chat' });
    }

    // Get all users for mention parsing
    const allUsers = await usersCollection.find({}).toArray();
    
    // Parse mentions from message text if not provided
    let mentions: string[] = providedMentions || [];
    if (message && !providedMentions) {
      mentions = parseMentions(message, allUsers.map(u => ({ id: u.id, name: u.name })));
    }

    // Create message
    const newMessage: ChatMessageDocument = {
      id: uuidv4(),
      chatId,
      senderId,
      message: message ? message.trim() : '',
      attachments: attachments || [],
      mentions: mentions.length > 0 ? mentions : undefined,
      readBy: [senderId], // Sender has read their own message
      replyTo: replyTo || undefined,
      createdAt: new Date().toISOString(),
    };

    await chatMessagesCollection.insertOne(newMessage);

    // Update chat last message time
    await chatsCollection.updateOne(
      { id: chatId },
      { $set: { lastMessageAt: new Date().toISOString() } }
    );

    // Get sender info for response
    const sender = await usersCollection.findOne({ id: senderId });
    const formattedMessage = formatChatMessage(newMessage);
    if (sender) {
      formattedMessage.sender = {
        id: sender.id,
        name: sender.name,
        role: sender.role,
      };
    }

    // Broadcast to all participants except sender
    const otherParticipants = chat.participantIds.filter(id => id !== senderId);
    otherParticipants.forEach(participantId => {
      broadcastChatMessage(participantId, formattedMessage);
    });

    // Send push notifications to mentioned users and all participants
    const notificationTitle = sender ? `${sender.name} in group chat` : 'New message';
    const notificationBody = message && message.length > 100 ? message.substring(0, 100) + '...' : (message || 'Sent an attachment');
    
    // Notify all participants (except sender)
    for (const participantId of otherParticipants) {
      // Special notification for mentioned users
      if (mentions.includes(participantId)) {
        await sendPushNotificationToUser(participantId, `@${sender?.name || 'Someone'} mentioned you`, notificationBody, {
          type: 'chat',
          chatId,
          messageId: newMessage.id,
        });
      } else {
        await sendPushNotificationToUser(participantId, notificationTitle, notificationBody, {
          type: 'chat',
          chatId,
          messageId: newMessage.id,
        });
      }
    }

    res.json(formattedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mark message as read
 * PUT /api/chats/messages/:messageId/read
 * Body: { userId: string }
 */
router.put('/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const chatMessagesCollection = await getCollection<ChatMessageDocument>('chatMessages');
    
    const message = await chatMessagesCollection.findOne({ id: messageId });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Add user to readBy array if not already there
    const readBy = message.readBy || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      
      await chatMessagesCollection.updateOne(
        { id: messageId },
        { $set: { readBy } }
      );

      // Broadcast update to sender
      broadcastChatMessage(message.senderId, {
        ...formatChatMessage(message),
        readBy,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get unread message count for group chat
 * GET /api/chats/unread-count?userId=xxx
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const chatMessagesCollection = await getCollection<ChatMessageDocument>('chatMessages');
    const GROUP_CHAT_ID = 'group-chat-all';
    
    // Count messages not read by this user (excluding own messages)
    const count = await chatMessagesCollection.countDocuments({
      chatId: GROUP_CHAT_ID,
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update group chat name
 * PUT /api/chats/:chatId/name
 * Body: { name: string, userId: string }
 */
router.put('/:chatId/name', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    const usersCollection = await getCollection('users');
    const chatsCollection = await getCollection<ChatDocument>('chats');

    // Verify user exists
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify chat exists
    const chat = await chatsCollection.findOne({ id: chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is a participant
    if (!chat.participantIds.includes(userId)) {
      return res.status(403).json({ error: 'User is not a participant in this chat' });
    }

    // Update group name
    await chatsCollection.updateOne(
      { id: chatId },
      { $set: { name: name.trim() } }
    );

    // Get updated chat
    const updatedChat = await chatsCollection.findOne({ id: chatId });
    if (!updatedChat) {
      return res.status(404).json({ error: 'Chat not found after update' });
    }

    const formatted = formatChat(updatedChat);
    
    // Broadcast update to all participants using data-update instead
    const { broadcastDataUpdate } = await import('../websocket/broadcast.js');
    broadcastDataUpdate('chat', formatted);

    res.json(formatted);
  } catch (error) {
    console.error('Update group name error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

