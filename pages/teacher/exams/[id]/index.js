import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function ExamDetail() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [exam, setExam] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const [poolSize, setPoolSize] = useState('');
  const [poolSaving, setPoolSaving] = useState(false);

  const load = () => apiFetch(`/api/exams/${id}`).then((d) => { setExam(d.exam); setPoolSize(d.exam.questionsToShow ?? ''); });
  useEffect(() => { if (user && id) load(); }, [user, id]); // eslint-disable-line

  const savePoolSize = async () => {
    setPoolSaving(true);
    try {
      const { exam: updated } = await apiFetch(`/api/exams/${id}`, { method: 'PATCH', body: { questionsToShow: poolSize === '' ? null : Number(poolSize) } });
      setExam(updated);
      push('Saved', 'success');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPoolSaving(false);
    }
  };

  const publish = async () => {
    try {
      await apiFetch(`/api/exams/${id}/publish`, { method: 'POST' });
      push('Exam published', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const close = async () => {
    try {
      await apiFetch(`/api/exams/${id}/close`, { method: 'POST' });
      push('Exam closed', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const remove = async () => {
    try {
      await apiFetch(`/api/exams/${id}`, { method: 'DELETE' });
      push('Exam deleted', 'success');
      router.push('/teacher/exams');
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user || !exam) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-600">{exam.subjectId?.name} · {exam.classId?.name}</p>
          <h1 dir="auto" className="font-display text-3xl font-semibold text-ink bidi-auto">{exam.title}</h1>
        </div>
        <span className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-full h-fit ${
          exam.status === 'DRAFT' ? 'bg-ink/10 text-ink/60' : exam.status === 'PUBLISHED' ? 'bg-primary-100 text-primary-700' : 'bg-red-50 text-red-600'
        }`}>{exam.status}</span>
      </div>

      <dl className="grid sm:grid-cols-4 gap-4 mb-6 bg-white border border-primary-100 rounded-xl p-5 text-sm">
        <div><dt className="text-ink/50">Deadline</dt><dd className="font-medium">{new Date(exam.deadline).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
        <div><dt className="text-ink/50">Duration</dt><dd className="font-medium">{exam.isTimed ? `${exam.duration} min` : 'Untimed'}</dd></div>
        <div><dt className="text-ink/50">Pass mark</dt><dd className="font-medium">{exam.passMark}%</dd></div>
        <div><dt className="text-ink/50">Randomization</dt><dd className="font-medium">{[exam.randomizeQuestions && 'Questions', exam.randomizeAnswers && 'Answers'].filter(Boolean).join(', ') || 'None'}</dd></div>
        <div className="sm:col-span-4 border-t border-primary-50 pt-4">
          <dt className="text-ink/50 mb-1">Questions shown per student</dt>
          {exam.status === 'DRAFT' ? (
            <dd className="flex items-center gap-2">
              <input
                type="number" min={1}
                placeholder="All questions"
                value={poolSize}
                onChange={(e) => setPoolSize(e.target.value)}
                className="w-32 border border-primary-200 rounded-lg px-3 py-1.5"
              />
              <button onClick={savePoolSize} disabled={poolSaving} className="text-primary-600 font-medium text-xs disabled:opacity-50">
                {poolSaving ? 'Saving…' : 'Save'}
              </button>
              <span className="text-xs text-ink/40">Leave blank to show every question in the bank.</span>
            </dd>
          ) : (
            <dd className="font-medium">{exam.questionsToShow || 'All questions'}</dd>
          )}
        </div>
      </dl>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link href={`/teacher/exams/${id}/questions`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
          Manage questions
        </Link>
        <Link href={`/teacher/exams/${id}/results`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
          Results & statistics
        </Link>
        {exam.status === 'DRAFT' && (
          <>
            <Link href={`/teacher/exams/${id}/edit`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
              Edit details
            </Link>
            <button onClick={() => setConfirmPublish(true)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium">Publish</button>
            <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">Delete</button>
          </>
        )}
        {exam.status === 'PUBLISHED' && (
          <button onClick={() => setConfirmClose(true)} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">Close exam</button>
        )}
      </div>

      <ConfirmDialog open={confirmPublish} title="Publish exam?" message="Students in the assigned class will be able to see and start this exam." confirmLabel="Publish" onCancel={() => setConfirmPublish(false)} onConfirm={() => { setConfirmPublish(false); publish(); }} />
      <ConfirmDialog open={confirmClose} title="Close exam?" message="Students will no longer be able to start this exam. In-progress attempts are unaffected." confirmLabel="Close" danger onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); close(); }} />
      <ConfirmDialog open={confirmDelete} title="Delete exam?" message="This permanently removes the exam and its questions." confirmLabel="Delete" danger onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); remove(); }} />
    </Layout>
  );
}