import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function ExamIntro() {
  const user = useRequireRole(['STUDENT']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (user && id) apiFetch(`/api/student/exams/${id}`).then(setData).catch((e) => push(e.message, 'error'));
  }, [user, id]);

  const start = async () => {
    setStarting(true);
    try {
      const d = await apiFetch(`/api/exams/${id}/start`, { method: 'POST' });
      router.push(`/student/exams/${id}/take`);
    } catch (err) {
      push(err.message, 'error');
      setStarting(false);
    }
  };

  if (!user || !data) return <Layout><Spinner /></Layout>;
  const { exam, questionCount, bankCount, attemptStatus } = data;

  if (attemptStatus && attemptStatus !== 'NOT_STARTED' && attemptStatus !== 'IN_PROGRESS') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto bg-white border border-primary-100 rounded-xl p-8 text-center">
          <p className="font-display text-2xl text-ink mb-2">Already attempted</p>
          <p className="text-ink/60">You've already submitted this exam. Only one attempt is allowed.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto bg-white border border-primary-100 rounded-xl p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 mb-1">{exam.subject}</p>
        <h1 className="font-display text-3xl font-semibold text-ink mb-4">{exam.title}</h1>
        {exam.description && <p className="text-ink/70 mb-6 whitespace-pre-wrap" dir="auto">{exam.description}</p>}

        <dl className="grid grid-cols-2 gap-4 text-sm mb-8 border-t border-primary-100 pt-6">
          <div>
            <dt className="text-ink/50">Questions</dt>
            <dd className="font-semibold text-ink">{questionCount}</dd>
            {bankCount > questionCount && <dd className="text-xs text-ink/40 mt-0.5">Randomly drawn from a bank of {bankCount}</dd>}
          </div>
          <div>
            <dt className="text-ink/50">Duration</dt>
            <dd className="font-semibold text-ink">{exam.isTimed ? `${exam.duration} minutes` : 'Untimed'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-ink/50">Deadline</dt>
            <dd className="font-semibold text-ink">{new Date(exam.deadline).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</dd>
          </div>
        </dl>

        {exam.isTimed && (
          <p className="text-xs text-gold-500 bg-gold-400/10 rounded-lg px-3 py-2 mb-6">Once you start, the timer cannot be paused. The exam will submit automatically when time runs out.</p>
        )}

        <button onClick={start} disabled={starting} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg">
          {starting ? 'Starting…' : attemptStatus === 'IN_PROGRESS' ? 'Resume exam' : 'Start exam'}
        </button>
      </div>
    </Layout>
  );
}
