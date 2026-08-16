import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function TeacherSubjects() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [subjects, setSubjects] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/api/teacher/subjects').then((d) => setSubjects(d.subjects));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/teacher/subjects', { method: 'POST', body: { name, description } });
      setName(''); setDescription('');
      push('Subject created', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (subject) => {
    try {
      await apiFetch(`/api/teacher/subjects/${subject._id}`, { method: 'PATCH', body: { isActive: !subject.isActive } });
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Subjects</h1>

      <form onSubmit={add} className="bg-white border border-primary-100 rounded-xl p-5 mb-8 grid sm:grid-cols-3 gap-3 items-end">
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-ink/70">Name</label>
          <input required dir="auto" placeholder="e.g. Hadith الحديث" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-ink/70">Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
          {saving ? 'Adding…' : 'Add subject'}
        </button>
      </form>

      {subjects === null && <Spinner />}
      {subjects && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {subjects.map((s) => (
            <div key={s._id} className="p-4 flex items-center justify-between">
              <p dir="auto" className={`font-medium bidi-auto ${s.isActive ? 'text-ink' : 'text-ink/40 line-through'}`}>{s.name}</p>
              <button onClick={() => toggleActive(s)} className="text-xs font-semibold text-primary-600">
                {s.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
