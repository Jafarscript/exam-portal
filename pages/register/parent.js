import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';

export default function RegisterParent() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/register/parent', { method: 'POST', body: form });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100 text-center">
          <h1 className="font-display text-2xl font-semibold text-primary-800 mb-3">Registration received</h1>
          <p className="text-ink/60 mb-6">Your account is pending teacher approval. You'll get an email once it's reviewed.</p>
          <Link href="/login" className="text-primary-600 font-medium">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-2xl font-semibold text-primary-800 mb-1 text-center">Parent registration</h1>
        <p className="text-xs text-center text-ink/50 mb-6">Requires teacher approval before you can log in.</p>
        {error && <p className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</p>}
        <label className="text-sm font-medium text-ink/70">Full name</label>
        <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full mt-1 mb-4 border border-primary-200 rounded-lg px-3 py-2" />
        <label className="text-sm font-medium text-ink/70">Email</label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 mb-4 border border-primary-200 rounded-lg px-3 py-2" />
        <label className="text-sm font-medium text-ink/70">Password</label>
        <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full mt-1 mb-6 border border-primary-200 rounded-lg px-3 py-2" />
        <button disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
          {loading ? 'Submitting…' : 'Register'}
        </button>
        <p className="text-center text-sm text-ink/60 mt-6">
          Already approved? <Link href="/login" className="text-primary-600 font-medium">Log in</Link>
        </p>
      </form>
    </div>
  );
}
