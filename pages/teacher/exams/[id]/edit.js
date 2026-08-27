import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { toLocalDatetimeLocal } from '@/lib/deadlineFormat';

export default function EditExam() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(null); // null until the exam has loaded
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    apiFetch('/api/teacher/classes').then((d) => setClasses(d.classes.filter((c) => c.isActive)));
    apiFetch('/api/teacher/subjects').then((d) => setSubjects(d.subjects.filter((s) => s.isActive)));
    apiFetch(`/api/exams/${id}`).then((d) => {
      const exam = d.exam;
      if (exam.status !== 'DRAFT' && exam.status !== 'CLOSED') {
        push('Only draft or closed exams can be edited', 'error');
        router.replace(`/teacher/exams/${id}`);
        return;
      }
      setForm({
        title: exam.title,
        description: exam.description || '',
        subjectId: exam.subjectId?._id || exam.subjectId,
        classId: exam.classId?._id || exam.classId,
        isTimed: exam.isTimed,
        duration: exam.duration || 30,
        deadline: toLocalDatetimeLocal(exam.deadline),
        passMark: exam.passMark,
        randomizeQuestions: exam.randomizeQuestions,
        randomizeAnswers: exam.randomizeAnswers,
        questionsToShow: exam.questionsToShow ?? '',
        requiresLiveApproval: exam.requiresLiveApproval !== false,
      });
    });
  }, [user, id]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/exams/${id}`, { method: 'PATCH', body: form });
      push('Exam updated', 'success');
      router.push(`/teacher/exams/${id}`);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !form) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <Link href={`/teacher/exams/${id}`} className="text-sm text-primary-600 mb-4 inline-block">← Back to exam</Link>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Edit exam</h1>
      <form onSubmit={submit} className="max-w-2xl bg-white border border-primary-100 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-ink/70">Title</label>
          <input dir="auto" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70">Description / instructions</label>
          <textarea dir="auto" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full mt-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink/70">Subject</label>
            <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2">
              <option value="">Select…</option>
              {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Class / level</label>
            <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2">
              <option value="">Select…</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-ink/70">Deadline</label>
            <input type="datetime-local" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
            <p className="text-xs text-ink/40 mt-1">Your local time</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Pass mark (%)</label>
            <input type="number" min={0} max={100} required value={form.passMark} onChange={(e) => setForm({ ...form, passMark: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Duration (minutes)</label>
            <input type="number" min={1} disabled={!form.isTimed} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2 disabled:bg-ink/5" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink/70">Questions per student (optional)</label>
            <input
              type="number"
              min={1}
              placeholder="Leave blank to show every question"
              value={form.questionsToShow}
              onChange={(e) => setForm({ ...form, questionsToShow: e.target.value })}
              className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2"
            />
            <p className="text-xs text-ink/40 mt-1">
              e.g. build a bank of 40 questions and set this to 20 — each student gets a different random 20, fixed for their attempt.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.requiresLiveApproval} onChange={(e) => setForm({ ...form, requiresLiveApproval: e.target.checked })} />
            <span className="font-semibold text-primary-900">Require Live Teacher Admittance / Screen-Share Verification</span>
          </label>
        </div>
        <p className="text-xs text-ink/50">
          When enabled, students who enter the exam are placed in a live waiting room until you verify their screen share and admit them.
        </p>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.isTimed} onChange={(e) => setForm({ ...form, isTimed: e.target.checked })} /> Timed exam
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setForm({ ...form, randomizeQuestions: e.target.checked })} /> Randomize question order
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.randomizeAnswers} onChange={(e) => setForm({ ...form, randomizeAnswers: e.target.checked })} /> Randomize answer order
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link href={`/teacher/exams/${id}`} className="text-sm font-medium text-ink/60 hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </Layout>
  );
}