import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';

// Debounced, retrying autosave for a single exam attempt's answers.
// - Each call is debounced per-question so fast typing doesn't spam the API.
// - Failed saves retry with backoff and surface 'error' status; they don't
//   silently drop the answer.
// - Status: 'idle' | 'saving' | 'saved' | 'error' | 'offline'
export function useAutosave(attemptId) {
  const [status, setStatus] = useState('idle');
  const timers = useRef({});
  const retryCounts = useRef({});
  const pendingValues = useRef({});

  const doSave = useCallback(
    async (questionId) => {
      const answer = pendingValues.current[questionId];
      setStatus('saving');
      try {
        await apiFetch(`/api/attempts/${attemptId}/answers`, {
          method: 'PATCH',
          body: { questionId, answer },
        });
        retryCounts.current[questionId] = 0;
        setStatus('saved');
      } catch (err) {
        if (err.data?.expired) {
          setStatus('error');
          return { expired: true };
        }
        const attempts = (retryCounts.current[questionId] || 0) + 1;
        retryCounts.current[questionId] = attempts;
        if (attempts <= 4) {
          setStatus('offline');
          timers.current[questionId] = setTimeout(() => doSave(questionId), Math.min(1000 * 2 ** attempts, 15000));
        } else {
          setStatus('error');
        }
      }
      return {};
    },
    [attemptId]
  );

  const save = useCallback(
    (questionId, answer) => {
      pendingValues.current[questionId] = answer;
      clearTimeout(timers.current[questionId]);
      timers.current[questionId] = setTimeout(() => doSave(questionId), 600);
    },
    [doSave]
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

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return { status, save, flush };
}
