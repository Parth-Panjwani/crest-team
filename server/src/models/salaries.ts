import { ObjectId } from 'mongodb';

export interface SalaryDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  month: string;
  type?: string;
  base?: number;
  hours?: number;
  calcPay?: number;
  adjustments?: number;
  advances?: unknown[] | string;
  storePurchases?: unknown[] | string;
  totalDeductions?: number;
  finalPay?: number;
  paid?: number | boolean;
  paidDate?: string | null;
  note?: string | null;
}

export interface SalaryResponse {
  id: string;
  userId: string;
  month: string;
  type: string;
  base: number;
  hours: number;
  calcPay: number;
  adjustments: number;
  advances: unknown[];
  storePurchases: unknown[];
  totalDeductions: number;
  finalPay: number;
  paid: boolean;
  paidDate?: string | null;
  note?: string | null;
}

function parseArray(value: unknown[] | string | undefined): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function parseBoolean(value: number | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return false;
}

export function formatSalary(doc: SalaryDocument): SalaryResponse {
  return {
    id: doc.id,
    userId: doc.userId,
    month: doc.month,
    type: doc.type || 'fixed',
    base: doc.base || 0,
    hours: doc.hours || 0,
    calcPay: doc.calcPay || 0,
    adjustments: doc.adjustments || 0,
    advances: parseArray(doc.advances),
    storePurchases: parseArray(doc.storePurchases),
    totalDeductions: doc.totalDeductions || 0,
    finalPay: doc.finalPay || 0,
    paid: parseBoolean(doc.paid),
    paidDate: doc.paidDate,
    note: doc.note,
  };
}

