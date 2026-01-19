import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePollingOptions<T> {
  /** Polling function that fetches data */
  fetcher: () => Promise<T>;
  /** Check if polling should continue based on fetched data */
  shouldContinue: (data: T) => boolean;
  /** Polling interval in ms (default: 2000) */
  interval?: number;
  /** Retry interval on error in ms (default: 5000) */
  errorRetryInterval?: number;
  /** Max consecutive errors before stopping (default: 3) */
  maxErrorCount?: number;
  /** Max polling duration in ms (default: no limit) */
  maxDuration?: number;
  /** Whether to start polling immediately (default: false) */
  enabled?: boolean;
  /** Callback on successful fetch */
  onSuccess?: (data: T) => void;
  /** Callback on fetch error */
  onError?: (error: Error) => void;
  /** Callback when max duration is reached */
  onTimeout?: () => void;
  /** Callback when max error count is reached */
  onMaxErrors?: () => void;
}

export interface UsePollingResult<T> {
  /** Latest fetched data */
  data: T | null;
  /** Latest error */
  error: Error | null;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Current consecutive error count */
  errorCount: number;
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Reset state and stop polling */
  reset: () => void;
}

export function usePolling<T>(options: UsePollingOptions<T>): UsePollingResult<T> {
  const {
    fetcher,
    shouldContinue,
    interval = 2000,
    errorRetryInterval = 5000,
    maxErrorCount = 3,
    maxDuration,
    enabled = false,
    onSuccess,
    onError,
    onTimeout,
    onMaxErrors,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Use refs to avoid stale closures in setTimeout callbacks
  const isPollingRef = useRef(false);
  const errorCountRef = useRef(0);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Store latest callbacks in refs to avoid dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onTimeoutRef = useRef(onTimeout);
  const onMaxErrorsRef = useRef(onMaxErrors);
  const fetcherRef = useRef(fetcher);
  const shouldContinueRef = useRef(shouldContinue);

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onTimeoutRef.current = onTimeout;
    onMaxErrorsRef.current = onMaxErrors;
    fetcherRef.current = fetcher;
    shouldContinueRef.current = shouldContinue;
  }, [onSuccess, onError, onTimeout, onMaxErrors, fetcher, shouldContinue]);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (durationTimeoutIdRef.current) {
      clearTimeout(durationTimeoutIdRef.current);
      durationTimeoutIdRef.current = null;
    }
  }, []);

  // Stop polling
  const stop = useCallback(() => {
    isPollingRef.current = false;
    setIsPolling(false);
    clearTimeouts();
    startTimeRef.current = null;
  }, [clearTimeouts]);

  // Reset state
  const reset = useCallback(() => {
    stop();
    setData(null);
    setError(null);
    setErrorCount(0);
    errorCountRef.current = 0;
  }, [stop]);

  // Poll function
  const poll = useCallback(async () => {
    if (!isPollingRef.current || !isMountedRef.current) {
      return;
    }

    try {
      const result = await fetcherRef.current();

      if (!isMountedRef.current) return;

      // Reset error count on success
      errorCountRef.current = 0;
      setErrorCount(0);
      setError(null);
      setData(result);

      // Call success callback
      onSuccessRef.current?.(result);

      // Check if we should continue polling
      if (shouldContinueRef.current(result) && isPollingRef.current) {
        timeoutIdRef.current = setTimeout(poll, interval);
      } else {
        // Polling complete - stop
        stop();
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      // Increment error count
      errorCountRef.current += 1;
      const currentErrorCount = errorCountRef.current;
      setErrorCount(currentErrorCount);

      // Call error callback
      onErrorRef.current?.(error);

      // Check if we've reached max errors
      if (currentErrorCount >= maxErrorCount) {
        onMaxErrorsRef.current?.();
        stop();
      } else if (isPollingRef.current) {
        // Retry with longer interval
        timeoutIdRef.current = setTimeout(poll, errorRetryInterval);
      }
    }
  }, [interval, errorRetryInterval, maxErrorCount, stop]);

  // Start polling
  const start = useCallback(() => {
    if (isPollingRef.current) return;

    // Reset state
    errorCountRef.current = 0;
    setErrorCount(0);
    setError(null);

    isPollingRef.current = true;
    setIsPolling(true);
    startTimeRef.current = Date.now();

    // Set up max duration timeout if specified
    if (maxDuration) {
      durationTimeoutIdRef.current = setTimeout(() => {
        if (isMountedRef.current && isPollingRef.current) {
          onTimeoutRef.current?.();
          stop();
        }
      }, maxDuration);
    }

    // Start polling immediately
    poll();
  }, [poll, maxDuration, stop]);

  // Auto-start if enabled
  useEffect(() => {
    if (enabled) {
      start();
    }
    // Only run on mount and when enabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    data,
    error,
    isPolling,
    errorCount,
    start,
    stop,
    reset,
  };
}

export default usePolling;
