import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import Timer from '@/components/Timer';
import SaveStatus from '@/components/SaveStatus';
import ConfirmDialog from '@/components/ConfirmDialog';
import QuestionRenderer from '@/components/QuestionRenderer';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useAutosave } from '@/hooks/useAutosave';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { apiFetch } from '@/lib/apiClient';
import {
  cacheExamSessionOffline,
  getExamSessionOffline,
  getAllOfflineAnswers,
  savePendingSubmission,
  getPendingSubmission,
  clearPendingSubmission,
} from '@/lib/offlineStorage';
import { RefreshCw, WifiOff } from 'lucide-react';

function isAnswered(question, value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
}

export default function TakeExam() {
  const user = useRequireRole(['STUDENT']);
  const router = useRouter();
  const { id } = router.query; // examId
  const { push } = useToast();
  const { isOnline } = useOnlineStatus();

  const [attemptId, setAttemptId] = useState(null);
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const { status: saveStatus, save, flush, syncQueue, pendingCount } = useAutosave(attemptId);
  const [proctorStatus, setProctorStatus] = useState(null);

  const loadAttempt = useCallback(async (aid) => {
    try {
      const data = await apiFetch(`/api/attempts/${aid}`);
      setExam(data.exam);
      setAttempt(data.attempt);
      setProctorStatus(data.attempt.proctorStatus || 'ADMITTED');

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        const mergedAnswers = {};
        // 1. Initial answers from server
        data.questions.forEach((q) => { mergedAnswers[q.id] = q.studentAnswer; });
        // 2. Overlay any recent un-synced offline local answers
        const offlineLocal = getAllOfflineAnswers(aid);
        Object.keys(offlineLocal).forEach((qid) => {
          if (offlineLocal[qid] !== undefined) {
            mergedAnswers[qid] = offlineLocal[qid];
          }
        });
        setAnswers(mergedAnswers);

        // Cache session for offline fallback
        await cacheExamSessionOffline(aid, {
          exam: data.exam,
          attempt: data.attempt,
          questions: data.questions,
          answers: mergedAnswers,
        });
      }

      if (data.attempt.status !== 'IN_PROGRESS') {
        router.replace('/student/exams');
      }
    } catch (err) {
      console.warn('Network loadAttempt failed, attempting offline cache recovery:', err.message);
      const cached = await getExamSessionOffline(aid);
      if (cached && cached.exam && cached.questions) {
        setExam(cached.exam);
        setAttempt(cached.attempt);
        setProctorStatus(cached.attempt?.proctorStatus || 'ADMITTED');
        setQuestions(cached.questions);
        const offlineLocal = getAllOfflineAnswers(aid);
        const initial = cached.answers || {};
        setAnswers({ ...initial, ...offlineLocal });
        push('Loaded exam session from offline local cache', 'info');
      } else {
        push(err.message || 'Could not load exam session', 'error');
      }
    }
  }, [push, router]);

  // Resuming / Starting
  useEffect(() => {
    if (!user || !id) return;
    apiFetch(`/api/exams/${id}/start`, { method: 'POST' })
      .then((d) => {
        setAttemptId(d.attemptId);
        setProctorStatus(d.proctorStatus || 'ADMITTED');
        return loadAttempt(d.attemptId);
      })
      .catch(async (err) => {
        // Check if there is already a cached attempt in local storage for this exam
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('exam_session_')) {
              const item = JSON.parse(localStorage.getItem(k) || '{}');
              if (item.exam && String(item.exam._id || item.exam.id) === String(id)) {
                setAttemptId(item.attemptId);
                setExam(item.exam);
                setAttempt(item.attempt);
                setQuestions(item.questions);
                const offlineLocal = getAllOfflineAnswers(item.attemptId);
                setAnswers({ ...(item.answers || {}), ...offlineLocal });
                push('Resumed exam from offline storage', 'info');
                return;
              }
            }
          }
        }
        push(err.message, 'error');
        router.replace('/student/exams');
      });
  }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling for teacher approval if waiting
  useEffect(() => {
    if (!attemptId || proctorStatus !== 'WAITING_APPROVAL' || !isOnline) return;
    const interval = setInterval(() => {
      loadAttempt(attemptId).catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [attemptId, proctorStatus, isOnline, loadAttempt]);

  // Integrity logging
  useEffect(() => {
    if (!attemptId || !isOnline) return;
    const onVisibility = () => {
      if (document.hidden) apiFetch(`/api/attempts/${attemptId}/integrity-event`, { method: 'POST', body: { type: 'TAB_SWITCH' } }).catch(() => {});
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) apiFetch(`/api/attempts/${attemptId}/integrity-event`, { method: 'POST', body: { type: 'FULLSCREEN_EXIT' } }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [attemptId, isOnline]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    setSubmitting(true);

    // If offline, queue submission locally
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      savePendingSubmission(attemptId);
      push('You are currently offline. Your submission is safely recorded on this device and will automatically finalize once reconnected.', 'info');
      setSubmitting(false);
      return;
    }

    try {
      submittedRef.current = true;
      // First sync any remaining pending answers
      await syncQueue();
      await apiFetch(`/api/attempts/${attemptId}/submit`, { method: 'POST' });
      clearPendingSubmission(attemptId);
      push('Exam submitted successfully', 'success');
      router.push('/student/exams');
    } catch (err) {
      push(err.message, 'error');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, push, router, syncQueue]);

  // Auto-submit if student reconnected and had a pending submission
  useEffect(() => {
    if (isOnline && attemptId) {
      const pendingSub = getPendingSubmission(attemptId);
      if (pendingSub && !submittedRef.current) {
        push('Internet reconnected — finalizing pending exam submission…', 'info');
        doSubmit();
      }
    }
  }, [isOnline, attemptId, doSubmit, push]);

  const handleExpire = useCallback(async () => {
    push('Time is up — submitting automatically', 'info');
    if (questions) await Promise.all(questions.map((q) => flush(q.id)));
    doSubmit();
  }, [doSubmit, flush, questions, push]);

  const answeredCount = useMemo(() => {
    if (!questions) return 0;
    return questions.filter((q) => isAnswered(q, answers[q.id])).length;
  }, [questions, answers]);

  if (!user || !attempt || !exam) {
    return (
      <Layout>
        <Spinner label="Loading exam session…" />
      </Layout>
    );
  }

  // Teacher Permission & Screen-Share Proctoring Waiting Room
  if (proctorStatus === 'WAITING_APPROVAL') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto my-8">
          <div className="bg-white border-2 border-primary-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Waiting for Teacher Verification
                </span>
              </div>
            </div>

            <h1 className="font-display text-2xl font-semibold text-primary-900 mb-2">
              {exam.title}
            </h1>
            <p className="text-sm text-ink/70 mb-6">
              Subject: <strong className="text-ink">{exam.subject}</strong> · Duration:{' '}
              <strong className="text-ink">{exam.isTimed ? `${exam.duration} minutes` : 'Untimed'}</strong>
            </p>

            <div className="bg-primary-50/70 border border-primary-100 rounded-xl p-5 mb-6 space-y-3">
              <h2 className="text-sm font-bold text-primary-900 uppercase tracking-wide">
                Live Proctoring & Screen-Share Instructions
              </h2>
              <div className="text-sm text-ink/80 space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <p>Join your class call/meeting and <strong>share your entire device screen</strong> with your teacher.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <p>Stay on this page. Once your teacher confirms your screen share, they will admit you.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  <p>Your exam questions and timer will <strong>unlock automatically</strong> in real time without refreshing.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary-50 rounded-xl px-5 py-4 border border-primary-100">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
                <p className="text-xs font-medium text-primary-900">
                  Listening for teacher authorization...
                </p>
              </div>
              <button
                onClick={() => loadAttempt(attemptId)}
                className="text-xs font-semibold text-primary-700 hover:text-primary-800 underline"
              >
                Check status now
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Layout>
        <Spinner label="Preparing your questions…" />
      </Layout>
    );
  }

  const q = questions[index];

  const onChange = (value) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    save(q.id, value);
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold text-ink">{exam.title}</h1>
                {!isOnline && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" />
                    Offline Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-ink/50">{exam.subject}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <SaveStatus status={saveStatus} pendingCount={pendingCount} />
              {pendingCount > 0 && isOnline && (
                <button
                  type="button"
                  onClick={syncQueue}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900 bg-primary-50 border border-primary-200 px-2 py-1 rounded-full transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync now
                </button>
              )}
              {exam.isTimed && attempt.expiresAt && <Timer expiresAt={attempt.expiresAt} onExpire={handleExpire} />}
            </div>
          </div>

          <QuestionRenderer question={q} value={answers[q.id]} onChange={onChange} index={index} total={questions.length} />

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium disabled:opacity-40"
            >
              ← Previous
            </button>
            {index < questions.length - 1 ? (
              <button onClick={() => setIndex((i) => i + 1)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium">
                Next →
              </button>
            ) : (
              <button onClick={() => setConfirmOpen(true)} className="px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-white text-sm font-semibold">
                Submit exam
              </button>
            )}
          </div>
        </div>

        <aside className="lg:w-56 order-1 lg:order-2">
          <div className="bg-white border border-primary-100 rounded-xl p-4 lg:sticky lg:top-4">
            <p className="text-xs font-semibold uppercase text-ink/50 mb-3">{answeredCount} of {questions.length} answered</p>
            <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
              {questions.map((qq, i) => (
                <button
                  key={qq.id}
                  onClick={() => setIndex(i)}
                  className={`h-8 rounded-md text-xs font-medium ${
                    i === index ? 'bg-primary-700 text-white' : isAnswered(qq, answers[qq.id]) ? 'bg-primary-100 text-primary-800' : 'bg-primary-50 text-ink/40 border border-primary-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button onClick={() => setConfirmOpen(true)} className="w-full mt-4 px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-white text-sm font-semibold">
              Submit exam
            </button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit exam?"
        message={
          !isOnline
            ? `You have answered ${answeredCount} of ${questions.length} questions. You are currently offline, so your submission will be safely recorded on this device and automatically finalized when internet reconnects.`
            : `You have answered ${answeredCount} of ${questions.length} questions. Once submitted you cannot make further changes.`
        }
        confirmLabel={submitting ? 'Submitting…' : !isOnline ? 'Save & Submit when Online' : 'Submit'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); doSubmit(); }}
      />
    </Layout>
  );
}
