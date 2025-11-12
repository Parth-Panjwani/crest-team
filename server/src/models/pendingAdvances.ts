import { ObjectId } from 'mongodb';

export interface PendingAdvanceDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  amount: number;
  description?: string;
  deducted?: boolean;
  deductedInSalaryId?: string;
  createdAt: string;
}

