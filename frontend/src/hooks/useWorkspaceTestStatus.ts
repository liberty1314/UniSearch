import { useCallback, useState } from 'react';
import { useWorkspaceTimeoutManager } from './useWorkspaceTimeoutManager';

type TestState = 'idle' | 'testing' | 'success' | 'error';

export function useWorkspaceTestStatus<TStatus extends TestState = TestState>() {
  const [testingStatus, setTestingStatus] = useState<Record<string, TStatus>>({});
  const { clearScheduledCallbacks, scheduleCallback } = useWorkspaceTimeoutManager();

  const clearTestingStatus = useCallback(() => {
    setTestingStatus({});
  }, []);

  const markTesting = useCallback((key: string) => {
    setTestingStatus((prev) => ({ ...prev, [key]: 'testing' as TStatus }));
  }, []);

  const markBatchTesting = useCallback((keys: string[]) => {
    setTestingStatus((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        next[key] = 'testing' as TStatus;
      });
      return next;
    });
  }, []);

  const markResult = useCallback((key: string, status: Exclude<TStatus, 'idle' | 'testing'>) => {
    setTestingStatus((prev) => ({ ...prev, [key]: status }));
  }, []);

  const resetKeyLater = useCallback((key: string, delay: number) => {
    scheduleCallback(() => {
      setTestingStatus((prev) => ({ ...prev, [key]: 'idle' as TStatus }));
    }, delay);
  }, [scheduleCallback]);

  const resetAllLater = useCallback((delay: number) => {
    scheduleCallback(() => {
      setTestingStatus({});
    }, delay);
  }, [scheduleCallback]);

  return {
    testingStatus,
    clearTestingStatus,
    clearTestingTimers: clearScheduledCallbacks,
    markTesting,
    markBatchTesting,
    markResult,
    resetKeyLater,
    resetAllLater,
  };
}
