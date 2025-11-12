import { ObjectId } from 'mongodb';

export interface LatePermissionDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string; // Date for which permission is requested
  requestedAt: string; // When the request was made
  reason: string;
  expectedArrivalTime?: string; // Expected arrival time (HH:mm)
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // Admin user ID
  approvedAt?: string;
  rejectionReason?: string;
}

export interface LatePermissionResponse {
  id: string;
  userId: string;
  date: string;
  requestedAt: string;
  reason: string;
  expectedArrivalTime?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export function formatLatePermission(doc: LatePermissionDocument): LatePermissionResponse {
  return {
    id: doc.id,
    userId: doc.userId,
    date: doc.date,
    requestedAt: doc.requestedAt,
    reason: doc.reason,
    expectedArrivalTime: doc.expectedArrivalTime,
    status: doc.status,
    approvedBy: doc.approvedBy,
    approvedAt: doc.approvedAt,
    rejectionReason: doc.rejectionReason,
  };
}

