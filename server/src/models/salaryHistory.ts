import { ObjectId } from 'mongodb';

export interface SalaryHistoryDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  oldBaseSalary: number | null;
  newBaseSalary: number;
  changedBy: string;
  reason?: string;
}

