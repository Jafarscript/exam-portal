import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function TeacherClasses() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [classes, setClasses] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/api/teacher/classes').then((d) => setClasses(d.classes));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/teacher/classes', { method: 'POST', body: { name, description } });
      setName(''); setDescription('');
      push('Class created', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cls) => {
    try {
      await apiFetch(`/api/teacher/classes/${cls._id}`, { method: 'PATCH', body: { isActive: !cls.isActive } });
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Classes / levels</h1>

      <form onSubmit={add} className="bg-white border border-primary-100 rounded-xl p-5 mb-8 grid sm:grid-cols-3 gap-3 items-end">
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-ink/70">Name</label>
          <input required placeholder="e.g. Intermediate" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-ink/70">Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
          {saving ? 'Adding…' : 'Add class'}
        </button>
      </form>

      {classes === null && <Spinner />}
      {classes && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {classes.map((c) => (
            <div key={c._id} className="p-4 flex items-center justify-between">
              <div>
                <p className={`font-medium ${c.isActive ? 'text-ink' : 'text-ink/40 line-through'}`}>{c.name}</p>
                {c.description && <p className="text-xs text-ink/50">{c.description}</p>}
              </div>
              <button onClick={() => toggleActive(c)} className="text-xs font-semibold text-primary-600">
                {c.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
