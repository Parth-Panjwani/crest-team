import { ObjectId } from 'mongodb';

export interface LateApprovalDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  attendanceId: string; // Related attendance record
  punchId: string; // The late punch that needs approval
  date: string;
  punchTime: string; // ISO string
  lateByMinutes: number;
  hasPermission: boolean; // Whether user had permission for this date
  permissionId?: string; // If permission exists
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
}

export interface LateApprovalResponse {
  id: string;
  userId: string;
  attendanceId: string;
  punchId: string;
  date: string;
  punchTime: string;
  lateByMinutes: number;
  hasPermission: boolean;
  permissionId?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
}

export function formatLateApproval(doc: LateApprovalDocument): LateApprovalResponse {
  return {
    id: doc.id,
    userId: doc.userId,
    attendanceId: doc.attendanceId,
    punchId: doc.punchId,
    date: doc.date,
    punchTime: doc.punchTime,
    lateByMinutes: doc.lateByMinutes,
    hasPermission: doc.hasPermission,
    permissionId: doc.permissionId,
    status: doc.status,
    requestedAt: doc.requestedAt,
    approvedBy: doc.approvedBy,
    approvedAt: doc.approvedAt,
    rejectionReason: doc.rejectionReason,
    adminNotes: doc.adminNotes,
  };
}

