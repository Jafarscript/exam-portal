import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 py-8">
      <div className="max-w-sm w-full mb-4">
        <Link
          id="back-to-home-link"
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-primary-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 rounded-xl shadow-sm border border-primary-100">
        <h1 className="font-display text-2xl font-semibold text-primary-800 mb-6 text-center">Log in</h1>
        {error && <p className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</p>}
        
        <label htmlFor="login-email-input" className="text-sm font-medium text-ink/70">Email</label>
        <input
          id="login-email-input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 mb-4 border border-primary-200 rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="name@example.com"
        />

        <label htmlFor="login-password-input" className="text-sm font-medium text-ink/70">Password</label>
        <div className="relative mt-1 mb-2">
          <input
            id="login-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-primary-200 rounded-lg pl-3 pr-10 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your password"
          />
          <button
            id="toggle-password-visibility-btn"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="text-right mb-4">
          <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
        </div>

        <button
          id="login-submit-btn"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-sm text-ink/60 mt-6">
          New here? <Link href="/register/parent" className="text-primary-600 font-medium hover:underline">Register as a parent</Link> or{' '}
          <Link href="/register/student" className="text-primary-600 font-medium hover:underline">as a student</Link>.
        </p>
      </form>
    </div>
  );
}
