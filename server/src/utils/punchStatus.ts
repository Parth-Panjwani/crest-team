// Store timings configuration
export const STORE_TIMINGS = {
  morningStart: '09:30', // 9:30 AM
  morningEnd: '13:40',   // 1:40 PM
  lunchStart: '13:40',   // 1:40 PM
  lunchEnd: '15:30',     // 3:30 PM
  eveningStart: '15:30', // 3:30 PM
  eveningEnd: '21:30',   // 9:30 PM
};

export type PunchStatus = 'on-time' | 'late' | 'early' | 'overtime' | null;

export interface PunchStatusInfo {
  status: PunchStatus;
  message: string;
  minutesDiff?: number;
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get expected check-in time for a given date
 */
function getExpectedCheckInTime(date: Date): { time: string; minutes: number } {
  const timeStr = STORE_TIMINGS.morningStart;
  return {
    time: timeStr,
    minutes: timeToMinutes(timeStr),
  };
}

/**
 * Get expected check-out time for a given date
 */
function getExpectedCheckOutTime(date: Date): { time: string; minutes: number } {
  const timeStr = STORE_TIMINGS.eveningEnd;
  return {
    time: timeStr,
    minutes: timeToMinutes(timeStr),
  };
}

/**
 * Format minutes into hours and minutes string
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculate punch status for check-in
 */
export function calculateCheckInStatus(punchTime: Date): PunchStatusInfo {
  const expected = getExpectedCheckInTime(punchTime);
  const punchMinutes = punchTime.getHours() * 60 + punchTime.getMinutes();
  const diff = punchMinutes - expected.minutes;

  // Allow 5 minutes grace period
  if (diff <= 5 && diff >= -15) {
    return {
      status: 'on-time',
      message: 'On time',
      minutesDiff: diff,
    };
  }

  if (diff > 5) {
    return {
      status: 'late',
      message: `Late by ${formatMinutes(diff)}`,
      minutesDiff: diff,
    };
  }

  if (diff < -15) {
    return {
      status: 'early',
      message: `Early by ${formatMinutes(Math.abs(diff))}`,
      minutesDiff: diff,
    };
  }

  return {
    status: 'on-time',
    message: 'On time',
    minutesDiff: diff,
  };
}

/**
 * Calculate punch status for check-out
 */
export function calculateCheckOutStatus(punchTime: Date, checkInTime: Date): PunchStatusInfo {
  const expected = getExpectedCheckOutTime(punchTime);
  const punchMinutes = punchTime.getHours() * 60 + punchTime.getMinutes();
  const expectedMinutes = expected.minutes;
  const diff = punchMinutes - expectedMinutes;

  // Calculate total work time
  const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  const totalWorkMinutes = punchMinutes - checkInMinutes;
  const expectedWorkMinutes = expectedMinutes - timeToMinutes(STORE_TIMINGS.morningStart);
  const lunchBreakMinutes = timeToMinutes(STORE_TIMINGS.lunchEnd) - timeToMinutes(STORE_TIMINGS.lunchStart);
  const netExpectedWorkMinutes = expectedWorkMinutes - lunchBreakMinutes;

  // If checking out after expected time, it's overtime
  if (diff > 0) {
    return {
      status: 'overtime',
      message: `Overtime: ${formatMinutes(diff)}`,
      minutesDiff: diff,
    };
  }

  // If checking out before expected time (more than 30 minutes early), it's early
  if (diff < -30) {
    return {
      status: 'early',
      message: `Early checkout by ${formatMinutes(Math.abs(diff))}`,
      minutesDiff: diff,
    };
  }

  return {
    status: 'on-time',
    message: 'On time',
    minutesDiff: diff,
  };
}

/**
 * Get punch status for any punch type
 */
export function getPunchStatus(
  punchType: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END',
  punchTime: Date,
  checkInTime?: Date
): PunchStatusInfo {
  if (punchType === 'IN') {
    return calculateCheckInStatus(punchTime);
  }

  if (punchType === 'OUT' && checkInTime) {
    return calculateCheckOutStatus(punchTime, checkInTime);
  }

  // For break punches, no status needed
  return {
    status: null,
    message: '',
  };
}

