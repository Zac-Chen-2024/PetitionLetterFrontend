import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSSEOptions<T> {
  /** SSE URL - set to null to disable */
  url: string | null;
  /** Callback when receiving progress updates */
  onMessage?: (data: T) => void;
  /** Callback when SSE completes (receives 'complete' event) */
  onComplete?: (data: T) => void;
  /** Callback on connection error */
  onError?: (error: Event) => void;
  /** Whether to auto-connect when URL is set (default: false) */
  autoConnect?: boolean;
}

export interface UseSSEResult<T> {
  /** Whether SSE is currently connected */
  isConnected: boolean;
  /** Latest received data */
  lastData: T | null;
  /** Connect to SSE stream */
  connect: () => void;
  /** Disconnect from SSE stream */
  disconnect: () => void;
}

/**
 * Hook for Server-Sent Events (SSE) connections
 *
 * Features:
 * - Handles connection/disconnection lifecycle
 * - Supports custom event types (progress, complete)
 * - Auto-cleanup on unmount
 * - EventSource handles auto-reconnection on connection loss
 */
export function useSSE<T>({
  url,
  onMessage,
  onComplete,
  onError,
  autoConnect = false,
}: UseSSEOptions<T>): UseSSEResult<T> {
  const [isConnected, setIsConnected] = useState(false);
  const [lastData, setLastData] = useState<T | null>(null);

  // Refs to avoid stale closures
  const eventSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);

  // Store callbacks in refs to avoid reconnection on callback changes
  const onMessageRef = useRef(onMessage);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Update callback refs
  useEffect(() => {
    onMessageRef.current = onMessage;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onMessage, onComplete, onError]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  // Connect function
  const connect = useCallback(() => {
    if (!url) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (isMountedRef.current) {
        setIsConnected(true);
      }
    };

    // Handle default message event (unnamed events)
    es.onmessage = (event) => {
      if (!isMountedRef.current) return;

      try {
        const data = JSON.parse(event.data) as T;
        setLastData(data);
        onMessageRef.current?.(data);
      } catch (e) {
        console.error('[useSSE] Failed to parse message:', e);
      }
    };

    // Handle 'progress' event
    es.addEventListener('progress', (event) => {
      if (!isMountedRef.current) return;

      try {
        const data = JSON.parse((event as MessageEvent).data) as T;
        setLastData(data);
        onMessageRef.current?.(data);
      } catch (e) {
        console.error('[useSSE] Failed to parse progress event:', e);
      }
    });

    // Handle 'complete' event
    es.addEventListener('complete', (event) => {
      if (!isMountedRef.current) return;

      try {
        const data = JSON.parse((event as MessageEvent).data) as T;
        setLastData(data);
        onCompleteRef.current?.(data);
        // Auto-disconnect on complete
        disconnect();
      } catch (e) {
        console.error('[useSSE] Failed to parse complete event:', e);
      }
    });

    es.onerror = (event) => {
      if (!isMountedRef.current) return;

      console.error('[useSSE] Connection error:', event);
      onErrorRef.current?.(event);

      // Note: EventSource automatically tries to reconnect
      // We just update the connected state
      setIsConnected(false);
    };
  }, [url, disconnect]);

  // Auto-connect if enabled and URL is set
  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }
  }, [autoConnect, url, connect]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Disconnect when URL becomes null
  useEffect(() => {
    if (!url && eventSourceRef.current) {
      disconnect();
    }
  }, [url, disconnect]);

  return {
    isConnected,
    lastData,
    connect,
    disconnect,
  };
}

export default useSSE;
