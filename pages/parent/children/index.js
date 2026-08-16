import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function Children() {
  const user = useRequireRole(['PARENT']);
  const { push } = useToast();
  const [children, setChildren] = useState(null);
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '' });
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/api/parent/children').then((d) => setChildren(d.children));

  useEffect(() => {
    if (user) load();
  }, [user]);

  const addChild = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/parent/children', { method: 'POST', body: form });
      setForm({ fullName: '', dateOfBirth: '' });
      push('Child added', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">My children</h1>

      <form onSubmit={addChild} className="bg-white border border-primary-100 rounded-xl p-5 mb-8 grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-sm font-medium text-ink/70">Full name</label>
          <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70">Date of birth (optional)</label>
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
        </div>
        <button disabled={saving} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
          {saving ? 'Adding…' : 'Add child'}
        </button>
      </form>

      {children === null && <Spinner />}
      {children && (
        <div className="grid sm:grid-cols-2 gap-4">
          {children.map((c) => (
            <Link key={c._id} href={`/parent/children/${c._id}`} className="bg-white border border-primary-100 rounded-xl p-5 hover:border-primary-300 transition">
              <p className="font-semibold text-ink">{c.fullName}</p>
              <p className="text-sm text-ink/50">{c.classId?.name || 'No class assigned yet — the teacher will assign one'}</p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
