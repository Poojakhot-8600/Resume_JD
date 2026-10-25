'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BatchStatus, UploadBatchStatusResponse } from '@/types';

export type PollingUIState = 'idle' | 'initiating' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';

interface UseBatchPollingOptions {
  storageKey?: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
  onCompleted?: (result: UploadBatchStatusResponse) => void;
  onError?: (errorMessage: string) => void;
}

export function useBatchPolling(options: UseBatchPollingOptions = {}) {
  const {
    storageKey,
    pollIntervalMs = 1500,
    maxAttempts = 40, // 40 * 1.5s = 60s timeout
    onCompleted,
    onError,
  } = options;

  const [uiState, setUiState] = useState<PollingUIState>('idle');
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<UploadBatchStatusResponse | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const attemptCountRef = useRef(0);
  const consecutiveNetworkErrorsRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const abortActiveRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const resetPolling = useCallback(() => {
    clearTimer();
    abortActiveRequest();
    isPollingRef.current = false;
    attemptCountRef.current = 0;
    consecutiveNetworkErrorsRef.current = 0;
    setUiState('idle');
    setActiveBatchId(null);
    setBatchResult(null);
    setPollingError(null);
    setIsTimedOut(false);
    if (storageKey && typeof window !== 'undefined') {
      sessionStorage.removeItem(storageKey);
    }
  }, [clearTimer, abortActiveRequest, storageKey]);

  const pollBatchStatus = useCallback(
    async (batchId: string) => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      abortActiveRequest();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const res = await fetch(`/api/batches/${encodeURIComponent(batchId)}`, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        consecutiveNetworkErrorsRef.current = 0;

        if (res.status === 404) {
          // Batch not found in database
          isPollingRef.current = false;
          setUiState('failed');
          const msg = `Batch "${batchId}" not found.`;
          setPollingError(msg);
          if (onError) onError(msg);
          if (storageKey && typeof window !== 'undefined') {
            sessionStorage.removeItem(storageKey);
          }
          return;
        }

        if (res.status === 401 || res.status === 403) {
          isPollingRef.current = false;
          setUiState('failed');
          const msg = 'Unauthorized to access this upload batch.';
          setPollingError(msg);
          if (onError) onError(msg);
          return;
        }

        let data: UploadBatchStatusResponse | null = null;
        try {
          data = await res.json();
        } catch {
          // JSON parsing failure, retry on next tick
          console.warn('[useBatchPolling] Received unparseable JSON response.');
        }

        if (!data || typeof data !== 'object') {
          // Malformed response, retry without declaring success or hard failure
          attemptCountRef.current += 1;
          isPollingRef.current = false;
          if (attemptCountRef.current < maxAttempts) {
            timerRef.current = setTimeout(() => pollBatchStatus(batchId), pollIntervalMs);
          }
          return;
        }

        const currentStatus = data.status;

        if (currentStatus === 'processing' || currentStatus === 'pending') {
          attemptCountRef.current += 1;

          if (attemptCountRef.current >= maxAttempts) {
            // Polling timed out (taking longer than expected)
            isPollingRef.current = false;
            setIsTimedOut(true);
            setUiState('processing'); // Do NOT mark failed unless confirmed by backend
            return;
          }

          // Continue polling while processing
          setUiState('processing');
          isPollingRef.current = false;
          timerRef.current = setTimeout(() => pollBatchStatus(batchId), pollIntervalMs);
          return;
        }

        if (
          currentStatus === 'completed' ||
          currentStatus === 'completed_with_errors' ||
          currentStatus === 'failed'
        ) {
          // Final status reached! Stop polling and display final counts
          isPollingRef.current = false;
          setIsTimedOut(false);
          setBatchResult(data);
          setUiState(currentStatus);

          if (storageKey && typeof window !== 'undefined') {
            sessionStorage.removeItem(storageKey);
          }

          if (onCompleted) {
            onCompleted(data);
          }
          return;
        }

        // Unknown status fallback
        attemptCountRef.current += 1;
        isPollingRef.current = false;
        timerRef.current = setTimeout(() => pollBatchStatus(batchId), pollIntervalMs);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          isPollingRef.current = false;
          return;
        }

        console.warn('[useBatchPolling] Network error during batch status poll:', err);
        consecutiveNetworkErrorsRef.current += 1;
        isPollingRef.current = false;

        if (consecutiveNetworkErrorsRef.current >= 5) {
          // Show non-fatal connectivity warning, do not declare success
          setPollingError('Network connection issue while checking batch status. Will retry...');
        }

        // Always retry after network glitch with backoff, never falsely declare success
        timerRef.current = setTimeout(
          () => pollBatchStatus(batchId),
          pollIntervalMs + Math.min(consecutiveNetworkErrorsRef.current * 1000, 5000)
        );
      }
    },
    [maxAttempts, pollIntervalMs, storageKey, onCompleted, onError, abortActiveRequest]
  );

  const startPolling = useCallback(
    (batchId: string) => {
      clearTimer();
      abortActiveRequest();
      isPollingRef.current = false;
      attemptCountRef.current = 0;
      consecutiveNetworkErrorsRef.current = 0;

      setActiveBatchId(batchId);
      setUiState('processing');
      setIsTimedOut(false);
      setPollingError(null);
      setBatchResult(null);

      if (storageKey && typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, batchId);
      }

      // Kick off first poll
      pollBatchStatus(batchId);
    },
    [clearTimer, abortActiveRequest, storageKey, pollBatchStatus]
  );

  const checkStatusNow = useCallback(() => {
    if (activeBatchId) {
      clearTimer();
      isPollingRef.current = false;
      setIsTimedOut(false);
      attemptCountRef.current = 0;
      pollBatchStatus(activeBatchId);
    }
  }, [activeBatchId, clearTimer, pollBatchStatus]);

  // Page refresh recovery: check if active batch was saved in sessionStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(storageKey);
      if (saved && saved.trim()) {
        console.log(`[useBatchPolling] Recovering active batch "${saved}" after page reload.`);
        startPolling(saved.trim());
      }
    }

    return () => {
      clearTimer();
      abortActiveRequest();
    };
  }, [storageKey, startPolling, clearTimer, abortActiveRequest]);

  return {
    uiState,
    setUiState,
    activeBatchId,
    batchResult,
    setBatchResult,
    pollingError,
    setPollingError,
    isTimedOut,
    startPolling,
    checkStatusNow,
    resetPolling,
    isProcessing: uiState === 'initiating' || uiState === 'processing',
  };
}
