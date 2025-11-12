import { Router } from 'express';
import { getCollection } from '../models/index.js';
import { formatUser } from '../models/users.js';
import { formatAttendance } from '../models/attendance.js';
import { formatNote } from '../models/notes.js';
import { formatLeave } from '../models/leaves.js';
import { formatSalary } from '../models/salaries.js';
import { formatAnnouncement } from '../models/announcements.js';
import { formatChat, formatChatMessage } from '../models/chats.js';
import type { UserDocument } from '../models/users.js';
import type { AttendanceDocument } from '../models/attendance.js';
import type { NoteDocument } from '../models/notes.js';
import type { LeaveDocument } from '../models/leaves.js';
import type { SalaryDocument } from '../models/salaries.js';
import type { AnnouncementDocument } from '../models/announcements.js';
import type { SalaryHistoryDocument } from '../models/salaryHistory.js';
import type { PendingAdvanceDocument } from '../models/pendingAdvances.js';
import type { PendingStorePurchaseDocument } from '../models/pendingStorePurchases.js';
import type { ChatDocument, ChatMessageDocument } from '../models/chats.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [
      usersCollection,
      notesCollection,
      leavesCollection,
      salariesCollection,
      attendanceCollection,
      salaryHistoryCollection,
      pendingAdvancesCollection,
      pendingStorePurchasesCollection,
      announcementsCollection,
      chatsCollection,
      chatMessagesCollection,
    ] = await Promise.all([
      getCollection<UserDocument>('users'),
      getCollection<NoteDocument>('notes'),
      getCollection<LeaveDocument>('leaves'),
      getCollection<SalaryDocument>('salaries'),
      getCollection<AttendanceDocument>('attendance'),
      getCollection<SalaryHistoryDocument>('salaryHistory'),
      getCollection<PendingAdvanceDocument>('pendingAdvances'),
      getCollection<PendingStorePurchaseDocument>('pendingStorePurchases'),
      getCollection<AnnouncementDocument>('announcements'),
      getCollection<ChatDocument>('chats'),
      getCollection<ChatMessageDocument>('chatMessages'),
    ]);

    const [users, notes, leaves, salaries, attendance, salaryHistory, pendingAdvances, pendingStorePurchases, announcements, chats, chatMessages] =
      await Promise.all([
        usersCollection.find({}).project({ _id: 0 }).toArray(),
        notesCollection
          .find({ deleted: { $ne: true } })
          .project({ _id: 0 })
          .sort({ createdAt: -1 })
          .toArray(),
        leavesCollection.find({}).project({ _id: 0 }).toArray(),
        salariesCollection.find({}).project({ _id: 0 }).toArray(),
        attendanceCollection.find({}).project({ _id: 0 }).toArray(),
        salaryHistoryCollection.find({}).project({ _id: 0 }).toArray(),
        pendingAdvancesCollection.find({ deducted: { $ne: true } }).project({ _id: 0 }).toArray(),
        pendingStorePurchasesCollection.find({ deducted: { $ne: true } }).project({ _id: 0 }).toArray(),
        announcementsCollection.find({}).project({ _id: 0 }).sort({ createdAt: -1 }).toArray(),
        chatsCollection.find({}).project({ _id: 0 }).toArray(),
        chatMessagesCollection.find({}).project({ _id: 0 }).toArray(),
      ]);

    res.json({
      users: (users as UserDocument[]).map(formatUser),
      notes: (notes as NoteDocument[]).map(formatNote),
      leaves: (leaves as LeaveDocument[]).map(formatLeave),
      salaries: (salaries as SalaryDocument[]).map(formatSalary),
      attendance: (attendance as AttendanceDocument[]).map(formatAttendance),
      salaryHistory,
      pendingAdvances,
      pendingStorePurchases,
      announcements: (announcements as AnnouncementDocument[]).map(formatAnnouncement),
      chats: (chats as ChatDocument[]).map(formatChat),
      chatMessages: (chatMessages as ChatMessageDocument[]).map(formatChatMessage),
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

