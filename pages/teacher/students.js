import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function TeacherStudents() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [students, setStudents] = useState(null);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ fullName: '', classId: '', createAccount: false, email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => apiFetch('/api/teacher/students').then((d) => setStudents(d.students));

  useEffect(() => {
    if (user) {
      load();
      apiFetch('/api/teacher/classes').then((d) => setClasses(d.classes));
    }
  }, [user]);

  const addStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/teacher/students', { method: 'POST', body: form });
      setForm({ fullName: '', classId: '', createAccount: false, email: '', password: '' });
      push('Student added', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveClass = async (studentId, classId) => {
    try {
      await apiFetch(`/api/teacher/students/${studentId}`, { method: 'PATCH', body: { classId } });
      push('Class updated', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const remove = async (studentId) => {
    if (!confirm('Remove this student?')) return;
    try {
      await apiFetch(`/api/teacher/students/${studentId}`, { method: 'DELETE' });
      push('Student removed', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Students</h1>

      <form onSubmit={addStudent} className="bg-white border border-primary-100 rounded-xl p-5 mb-8 space-y-3">
        <h2 className="font-semibold text-ink text-sm">Add a student</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="border border-primary-200 rounded-lg px-3 py-2" />
          <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="border border-primary-200 rounded-lg px-3 py-2">
            <option value="">No class yet</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
          Create a login for this student (independent student account)
        </label>
        {form.createAccount && (
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="email" placeholder="Email" required={form.createAccount} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-primary-200 rounded-lg px-3 py-2" />
            <input type="password" placeholder="Password" minLength={8} required={form.createAccount} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border border-primary-200 rounded-lg px-3 py-2" />
          </div>
        )}
        <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg">
          {saving ? 'Adding…' : 'Add student'}
        </button>
      </form>

      {students === null && <Spinner />}
      {students && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {students.map((s) => (
            <div key={s._id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-ink">{s.fullName}</p>
                <p className="text-xs text-ink/50">{s.isIndependent ? 'Independent account' : 'Managed by parent'}</p>
              </div>
              <div className="flex items-center gap-2">
                <select defaultValue={s.classId?._id || ''} onChange={(e) => saveClass(s._id, e.target.value)} className="border border-primary-200 rounded-lg px-2 py-1.5 text-sm">
                  <option value="">No class</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <button onClick={() => remove(s._id)} className="text-red-600 text-xs font-semibold">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
