import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for auto-refreshing data at regular intervals
 * @param refreshFn Function to call for refreshing data
 * @param intervalMs Interval in milliseconds (default: 2000ms = 2 seconds)
 */
export function useAutoRefresh(refreshFn: () => void, intervalMs: number = 2000) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const refreshFnRef = useRef(refreshFn)

  // Update ref when function changes
  useEffect(() => {
    refreshFnRef.current = refreshFn
  }, [refreshFn])

  useEffect(() => {
    // Initial load
    refreshFnRef.current()

    // Set up interval
    intervalRef.current = setInterval(() => {
      refreshFnRef.current()
    }, intervalMs)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [intervalMs])

  // Manual refresh function
  const refresh = useCallback(() => {
    refreshFnRef.current()
  }, [])

  return { refresh }
}

