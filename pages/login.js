import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(`/${user.role.toLowerCase()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-2xl font-semibold text-primary-800 mb-6 text-center">Log in</h1>
        {error && <p className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</p>}
        <label className="text-sm font-medium text-ink/70">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 mb-4 border border-primary-200 rounded-lg px-3 py-2" />
        <label className="text-sm font-medium text-ink/70">Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 mb-2 border border-primary-200 rounded-lg px-3 py-2" />
        <div className="text-right mb-4">
          <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
        </div>
        <button disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <p className="text-center text-sm text-ink/60 mt-6">
          New here? <Link href="/register/parent" className="text-primary-600 font-medium">Register as a parent</Link> or{' '}
          <Link href="/register/student" className="text-primary-600 font-medium">as a student</Link>.
        </p>
      </form>
    </div>
  );
}
