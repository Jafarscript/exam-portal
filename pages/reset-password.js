import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';

export default function ResetPassword() {
  const router = useRouter();
  const { token, email } = router.query;
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', body: { email, token, password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-2xl font-semibold text-primary-800 mb-6 text-center">Set a new password</h1>
        {error && <p className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</p>}
        {done ? (
          <p className="text-sm text-ink/70 text-center mb-4">Password reset. <Link href="/login" className="text-primary-600 font-medium">Log in</Link></p>
        ) : (
          <>
            <label className="text-sm font-medium text-ink/70">New password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 mb-6 border border-primary-200 rounded-lg px-3 py-2" />
            <button disabled={loading || !token} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
