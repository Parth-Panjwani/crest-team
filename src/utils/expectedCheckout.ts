import { STORE_TIMINGS } from '@/lib/store';

/**
 * Calculate expected checkout time based on check-in time
 * - Morning check-in (before 3:30 PM): expected checkout 1:40 PM
 * - Afternoon check-in (after 3:30 PM): expected checkout 9:30 PM
 */
export function getExpectedCheckoutTime(checkInTime: Date): Date {
  const checkInHours = checkInTime.getHours();
  const checkInMinutes = checkInTime.getMinutes();
  const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;
  
  // 3:30 PM = 15:30 = 15 * 60 + 30 = 930 minutes
  const afternoonThreshold = 15 * 60 + 30; // 3:30 PM
  
  const expectedDate = new Date(checkInTime);
  
  if (checkInTotalMinutes < afternoonThreshold) {
    // Morning check-in: expected checkout at 1:40 PM (13:40)
    expectedDate.setHours(13, 40, 0, 0);
  } else {
    // Afternoon check-in: expected checkout at 9:30 PM (21:30)
    expectedDate.setHours(21, 30, 0, 0);
  }
  
  return expectedDate;
}

/**
 * Format time in 12-hour format
 */
export function formatTime12Hour(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

