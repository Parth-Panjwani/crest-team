import { ObjectId } from 'mongodb';

export interface PendingStorePurchaseDocument {
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

