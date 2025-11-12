import { Express } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import attendanceRoutes from './attendance.js';
import noteRoutes from './notes.js';
import leaveRoutes from './leaves.js';
import salaryRoutes from './salaries.js';
import salaryHistoryRoutes from './salaryHistory.js';
import pendingAdvancesRoutes from './pendingAdvances.js';
import pendingStorePurchasesRoutes from './pendingStorePurchases.js';
import announcementRoutes from './announcements.js';
import notificationRoutes from './notifications.js';
import latePermissionRoutes from './latePermissions.js';
import lateApprovalRoutes from './lateApprovals.js';
import bootstrapRoutes from './bootstrap.js';
import fileRoutes from './files.js';
import chatRoutes from './chats.js';
import fcmRoutes from './fcm.js';

export function setupRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/leaves', leaveRoutes);
  app.use('/api/salaries', salaryRoutes);
  app.use('/api/salaryHistory', salaryHistoryRoutes);
  app.use('/api/pendingAdvances', pendingAdvancesRoutes);
  app.use('/api/pendingStorePurchases', pendingStorePurchasesRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/latePermissions', latePermissionRoutes);
  app.use('/api/lateApprovals', lateApprovalRoutes);
  app.use('/api/bootstrap', bootstrapRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/fcm', fcmRoutes);
}

