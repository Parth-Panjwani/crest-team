/**
 * Format minutes into a human-readable string with hours and minutes
 * @param minutes - Total minutes
 * @returns Formatted string like "2h 19m" or "45m" or "0m"
 */
export function formatMinutesToHours(minutes: number): string {
  if (minutes < 0) {
    return '0m';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Calculate minutes late from store opening time (9:30 AM)
 * @param punchTime - The time when the employee punched in
 * @returns Minutes late from 9:30 AM
 */
export function calculateLateMinutes(punchTime: Date): number {
  const storeOpenTime = new Date(punchTime);
  storeOpenTime.setHours(9, 30, 0, 0); // 9:30 AM
  
  const diffMs = punchTime.getTime() - storeOpenTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Return 0 if on time or early
  return Math.max(0, diffMinutes);
}

