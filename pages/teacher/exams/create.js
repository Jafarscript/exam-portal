import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function CreateExam() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', subjectId: '', classId: '',
    isTimed: true, duration: 30, deadline: '', passMark: 50,
    randomizeQuestions: false, randomizeAnswers: false, questionsToShow: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      apiFetch('/api/teacher/classes').then((d) => setClasses(d.classes.filter((c) => c.isActive)));
      apiFetch('/api/teacher/subjects').then((d) => setSubjects(d.subjects.filter((s) => s.isActive)));
    }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { exam } = await apiFetch('/api/exams', { method: 'POST', body: form });
      push('Exam created as draft', 'success');
      router.push(`/teacher/exams/${exam._id}`);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">New exam</h1>
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
            <p className="text-xs text-ink/40 mt-1">UK time (Europe/London)</p>
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
            <input type="checkbox" checked={form.isTimed} onChange={(e) => setForm({ ...form, isTimed: e.target.checked })} /> Timed exam
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setForm({ ...form, randomizeQuestions: e.target.checked })} /> Randomize question order
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.randomizeAnswers} onChange={(e) => setForm({ ...form, randomizeAnswers: e.target.checked })} /> Randomize answer order
          </label>
        </div>

        <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg">
          {saving ? 'Creating…' : 'Create draft'}
        </button>
      </form>
    </Layout>
  );
}
