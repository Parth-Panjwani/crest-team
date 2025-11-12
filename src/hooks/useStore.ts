import { useEffect, useState } from 'react';
import { store } from '@/lib/store';

/**
 * Hook to subscribe to store updates and force component re-renders
 * when store data changes
 */
export function useStore() {
  const [, setUpdateCounter] = useState(0);

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = store.subscribe(() => {
      // Force re-render by updating state
      setUpdateCounter(prev => prev + 1);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return store;
}

