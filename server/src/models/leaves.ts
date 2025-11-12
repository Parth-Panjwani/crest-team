import { ObjectId } from 'mongodb';

export interface LeaveDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  type: string;
  reason?: string;
  status: string;
  salaryDeduction?: boolean; // Whether salary should be deducted for this leave
  approvedBy?: string; // Admin who approved/rejected
  approvedAt?: string; // When it was approved/rejected
}

export interface LeaveResponse {
  id: string;
  userId: string;
  date: string;
  type: string;
  reason?: string;
  status: string;
  salaryDeduction?: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export function formatLeave(doc: LeaveDocument): LeaveResponse {
  return {
    id: doc.id,
    userId: doc.userId,
    date: doc.date,
    type: doc.type,
    reason: doc.reason,
    status: doc.status,
    salaryDeduction: doc.salaryDeduction,
    approvedBy: doc.approvedBy,
    approvedAt: doc.approvedAt,
  };
}

