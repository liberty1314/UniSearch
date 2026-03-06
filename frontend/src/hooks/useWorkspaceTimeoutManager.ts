import { useCallback, useEffect, useRef } from 'react';

export function useWorkspaceTimeoutManager() {
  const timeoutIdsRef = useRef<number[]>([]);

  const clearScheduledCallbacks = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  const scheduleCallback = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      callback();
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  useEffect(() => () => clearScheduledCallbacks(), [clearScheduledCallbacks]);

  return {
    clearScheduledCallbacks,
    scheduleCallback,
  };
}
