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
import { apiFetch } from '@/lib/apiClient';

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

  const [attemptId, setAttemptId] = useState(null);
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const { status: saveStatus, save, flush } = useAutosave(attemptId);

  const loadAttempt = useCallback(async (aid) => {
    const data = await apiFetch(`/api/attempts/${aid}`);
    setExam(data.exam);
    setAttempt(data.attempt);
    setQuestions(data.questions);
    const initialAnswers = {};
    data.questions.forEach((q) => { initialAnswers[q.id] = q.studentAnswer; });
    setAnswers(initialAnswers);
    if (data.attempt.status !== 'IN_PROGRESS') {
      router.replace('/student/exams');
    }
  }, [router]);

  // Resuming: calling start again on an IN_PROGRESS attempt just returns the
  // same attemptId without re-randomizing anything.
  useEffect(() => {
    if (!user || !id) return;
    apiFetch(`/api/exams/${id}/start`, { method: 'POST' })
      .then((d) => {
        setAttemptId(d.attemptId);
        return loadAttempt(d.attemptId);
      })
      .catch((err) => {
        push(err.message, 'error');
        router.replace('/student/exams');
      });
  }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Integrity logging - visible-tab and fullscreen changes only, never
  // blocking or auto-submitting.
  useEffect(() => {
    if (!attemptId) return;
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
  }, [attemptId]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const result = await apiFetch(`/api/attempts/${attemptId}/submit`, { method: 'POST' });
      push('Exam submitted', 'success');
      router.push('/student/exams');
    } catch (err) {
      push(err.message, 'error');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, push, router]);

  const handleExpire = useCallback(async () => {
    push('Time is up — submitting automatically', 'info');
    // Flush any last pending saves before locking the attempt.
    if (questions) await Promise.all(questions.map((q) => flush(q.id)));
    doSubmit();
  }, [doSubmit, flush, questions]);

  const answeredCount = useMemo(() => {
    if (!questions) return 0;
    return questions.filter((q) => isAnswered(q, answers[q.id])).length;
  }, [questions, answers]);

  if (!user || !questions) return <Layout><Spinner label="Preparing your exam…" /></Layout>;

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
              <h1 className="font-display text-2xl font-semibold text-ink">{exam.title}</h1>
              <p className="text-xs text-ink/50">{exam.subject}</p>
            </div>
            <div className="flex items-center gap-3">
              <SaveStatus status={saveStatus} />
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
        message={`You have answered ${answeredCount} of ${questions.length} questions. Once submitted you cannot make further changes.`}
        confirmLabel={submitting ? 'Submitting…' : 'Submit'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); doSubmit(); }}
      />
    </Layout>
  );
}
