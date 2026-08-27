import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';
import { ArrowLeft, AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';

export default function RegisterParent() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) {
      errs.fullName = 'Full name is required';
    } else if (form.fullName.trim().length < 2) {
      errs.fullName = 'Name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/auth/register/parent', { method: 'POST', body: form });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-8">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-primary-100 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-primary-800 mb-2">
            Registration Received
          </h1>
          <p className="text-sm text-ink/70 mb-6 leading-relaxed">
            Your parent account has been submitted and is pending teacher approval. Once approved, you will be able to log in and monitor your children's progress.
          </p>
          <Link
            href="/login"
            className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition"
          >
            Back to Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 py-8">
      <div className="max-w-md w-full mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-primary-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-primary-100">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-600 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">
            Parent Registration
          </h1>
          <p className="text-xs text-ink/50 mt-1">Requires teacher approval before first sign in.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="parent-fullname" className="text-xs sm:text-sm font-medium text-ink/70">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="parent-fullname"
              required
              placeholder="e.g. Fatima Omar"
              value={form.fullName}
              onChange={(e) => {
                setForm({ ...form, fullName: e.target.value });
                if (errors.fullName) setErrors({ ...errors, fullName: null });
              }}
              className={`w-full mt-1 border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                errors.fullName ? 'border-red-400 bg-red-50/20 focus:ring-red-100' : 'border-primary-200 focus:ring-primary-500'
              }`}
            />
            {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="parent-email" className="text-xs sm:text-sm font-medium text-ink/70">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="parent-email"
              type="email"
              required
              placeholder="fatima@example.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              className={`w-full mt-1 border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-400 bg-red-50/20 focus:ring-red-100' : 'border-primary-200 focus:ring-primary-500'
              }`}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="parent-password" className="text-xs sm:text-sm font-medium text-ink/70">
              Password (minimum 8 characters) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                id="parent-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                className={`w-full border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 ${
                  errors.password ? 'border-red-400 bg-red-50/20 focus:ring-red-100' : 'border-primary-200 focus:ring-primary-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg text-sm transition shadow-sm"
          >
            {loading ? 'Submitting registration…' : 'Submit Parent Registration'}
          </button>

          <p className="text-center text-xs sm:text-sm text-ink/60 pt-2">
            Already have an approved account? <Link href="/login" className="text-primary-600 font-semibold hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
