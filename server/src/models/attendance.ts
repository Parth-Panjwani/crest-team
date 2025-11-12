import { ObjectId } from 'mongodb';

export type AttendancePunchType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';

export interface AttendancePunch {
  at: string;
  type: AttendancePunchType;
  manualPunch?: boolean;
  punchedBy?: string;
  reason?: string;
  status?: 'on-time' | 'late' | 'early' | 'overtime';
  statusMessage?: string;
  lateApprovalId?: string; // ID of late approval if this punch is late and needs approval
}

export interface AttendanceTotals {
  workMin: number;
  breakMin: number;
}

export interface AttendanceDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  date: string;
  punches: AttendancePunch[] | string;
  totals: AttendanceTotals | string;
}

export interface AttendanceResponse {
  id: string;
  userId: string;
  date: string;
  punches: AttendancePunch[];
  totals: AttendanceTotals;
  status?: {
    checkIn?: 'on-time' | 'late' | 'early';
    checkOut?: 'on-time' | 'early' | 'overtime';
  };
}

function parsePunches(punches: AttendancePunch[] | string): AttendancePunch[] {
  if (Array.isArray(punches)) {
    return punches;
  }
  if (typeof punches === 'string') {
    try {
      return JSON.parse(punches);
    } catch {
      return [];
    }
  }
  return [];
}

function parseTotals(totals: AttendanceTotals | string): AttendanceTotals {
  if (typeof totals === 'object' && totals !== null && 'workMin' in totals) {
    return totals as AttendanceTotals;
  }
  if (typeof totals === 'string') {
    try {
      return JSON.parse(totals);
    } catch {
      return { workMin: 0, breakMin: 0 };
    }
  }
  return { workMin: 0, breakMin: 0 };
}

export function formatAttendance(doc: AttendanceDocument): AttendanceResponse {
  const punches = parsePunches(doc.punches);
  const checkInPunch = punches.find(p => p.type === 'IN');
  const checkOutPunch = punches.find(p => p.type === 'OUT');
  
  const status: AttendanceResponse['status'] = {};
  if (checkInPunch?.status) {
    status.checkIn = checkInPunch.status as 'on-time' | 'late' | 'early';
  }
  if (checkOutPunch?.status) {
    status.checkOut = checkOutPunch.status as 'on-time' | 'early' | 'overtime';
  }
  
  return {
    id: doc.id,
    userId: doc.userId,
    date: doc.date,
    punches,
    totals: parseTotals(doc.totals),
    status: Object.keys(status).length > 0 ? status : undefined,
  };
}

