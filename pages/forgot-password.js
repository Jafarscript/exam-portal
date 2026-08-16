import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } });
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-2xl font-semibold text-primary-800 mb-6 text-center">Reset password</h1>
        {sent ? (
          <p className="text-sm text-ink/70 text-center">If an account exists for that email, a reset link has been sent.</p>
        ) : (
          <>
            <label className="text-sm font-medium text-ink/70">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 mb-6 border border-primary-200 rounded-lg px-3 py-2" />
            <button disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <p className="text-center text-sm text-ink/60 mt-6">
          <Link href="/login" className="text-primary-600 font-medium">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
