import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import {
  storeOfflineAnswer,
  getPendingSyncQueue,
  removeSyncedAnswerFromQueue,
  clearPendingSyncQueue,
} from '@/lib/offlineStorage';

// Resilient autosave & offline sync for exam attempts.
// 1. Immediately persists every answer to IndexedDB / localStorage.
// 2. Debounces server calls per-question to avoid spam.
// 3. Catches network dropouts, enqueues changes, and auto-syncs when online.
// 4. Exposes status: 'idle' | 'saving' | 'saved' | 'offline' | 'syncing' | 'error'
export function useAutosave(attemptId) {
  const [status, setStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const timers = useRef({});
  const retryCounts = useRef({});
  const pendingValues = useRef({});
  const isSyncingRef = useRef(false);

  // Update pending queue count
  const refreshPendingCount = useCallback(() => {
    if (!attemptId) return;
    const queue = getPendingSyncQueue(attemptId);
    setPendingCount(queue.length);
  }, [attemptId]);

  // Sync entire offline queue to backend
  const syncQueue = useCallback(async () => {
    if (!attemptId || isSyncingRef.current) return;
    const queue = getPendingSyncQueue(attemptId);
    if (queue.length === 0) {
      setPendingCount(0);
      return;
    }

    isSyncingRef.current = true;
    setStatus('syncing');

    try {
      // Send batch to backend
      const batchPayload = queue.map((item) => ({
        questionId: item.questionId,
        answer: item.answer,
      }));

      await apiFetch(`/api/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        body: { batch: batchPayload },
      });

      // Clear synced items
      clearPendingSyncQueue(attemptId);
      setPendingCount(0);
      setStatus('saved');
    } catch (err) {
      console.warn('Batch sync failed, will retry individually or on next connection:', err.message);
      if (err.data?.expired) {
        setStatus('error');
      } else {
        setStatus('offline');
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [attemptId]);

  const doSave = useCallback(
    async (questionId) => {
      const answer = pendingValues.current[questionId];
      if (answer === undefined) return {};

      // 1. Always store locally first
      await storeOfflineAnswer(attemptId, questionId, answer);
      refreshPendingCount();

      // If navigator says offline, don't waste time on fetch, mark offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setStatus('offline');
        return { offline: true };
      }

      setStatus('saving');
      try {
        await apiFetch(`/api/attempts/${attemptId}/answers`, {
          method: 'PATCH',
          body: { questionId, answer },
        });
        
        // Remove from pending sync queue
        removeSyncedAnswerFromQueue(attemptId, questionId);
        refreshPendingCount();
        retryCounts.current[questionId] = 0;
        setStatus('saved');
        return { success: true };
      } catch (err) {
        if (err.data?.expired) {
          setStatus('error');
          return { expired: true };
        }

        const attempts = (retryCounts.current[questionId] || 0) + 1;
        retryCounts.current[questionId] = attempts;

        // Still saved offline locally
        setStatus('offline');
        refreshPendingCount();

        if (attempts <= 4) {
          timers.current[questionId] = setTimeout(
            () => doSave(questionId),
            Math.min(1000 * 2 ** attempts, 15000)
          );
        }
        return { offline: true };
      }
    },
    [attemptId, refreshPendingCount]
  );

  const save = useCallback(
    (questionId, answer) => {
      pendingValues.current[questionId] = answer;
      // Immediately write locally so immediate browser closure or tab switch is safe
      storeOfflineAnswer(attemptId, questionId, answer);
      refreshPendingCount();

      clearTimeout(timers.current[questionId]);
      timers.current[questionId] = setTimeout(() => doSave(questionId), 500);
    },
    [attemptId, doSave, refreshPendingCount]
  );

  const flush = useCallback(
    async (questionId) => {
      clearTimeout(timers.current[questionId]);
      if (pendingValues.current[questionId] !== undefined) {
        return doSave(questionId);
      }
    },
    [doSave]
  );

  // Auto-sync when device comes back online
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      syncQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, [syncQueue]);

  // Initial check on mount
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    status,
    save,
    flush,
    syncQueue,
    pendingCount,
  };
}
