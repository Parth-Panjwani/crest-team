import { broadcastToAll, broadcastToUser, WebSocketMessage } from './index.js';

export function broadcast(type: string, payload: unknown, userId?: string) {
  const message: WebSocketMessage = { type, payload };
  
  if (userId) {
    broadcastToUser(userId, message);
  } else {
    broadcastToAll(message);
  }
}

export function broadcastDataUpdate(dataType: string, data: unknown, userId?: string) {
  broadcast('data-update', { dataType, data }, userId);
}

export function broadcastAttendanceUpdate(attendance: unknown, userId?: string) {
  broadcastDataUpdate('attendance', attendance, userId);
}

export function broadcastNoteUpdate(note: unknown, userId?: string) {
  broadcastDataUpdate('note', note, userId);
}

export function broadcastLeaveUpdate(leave: unknown, userId?: string) {
  broadcastDataUpdate('leave', leave, userId);
}

export function broadcastSalaryUpdate(salary: unknown, userId?: string) {
  broadcastDataUpdate('salary', salary, userId);
}

export function broadcastUserUpdate(user: unknown, userId?: string) {
  broadcastDataUpdate('user', user, userId);
}

export function broadcastAnnouncementUpdate(announcement: unknown) {
  broadcastDataUpdate('announcement', announcement);
}

