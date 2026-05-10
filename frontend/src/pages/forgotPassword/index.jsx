import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { forgotPassword } from '../../api/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <FolderKanban size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Projects Tracker</h1>
          <p className="mt-1 text-sm text-white/60">Recover your account</p>
        </div>

        <div className="rounded-xl bg-surface-card border border-border p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
                <svg className="h-6 w-6 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-text-primary">Check your email</p>
              <p className="text-sm text-text-secondary">
                If <strong>{email}</strong> is registered, you will receive a reset link shortly.
              </p>
              <Link to="/login" className="block text-sm text-primary-600 hover:underline mt-2">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-text-primary mb-1">Forgot your password?</h2>
                <p className="text-sm text-text-secondary">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-500">{error}</div>
              )}

              <div>
                <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Email Address
                </label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-border-dark bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>

              <Link to="/login" className="block text-center text-sm text-text-secondary hover:text-text-primary transition-colors">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
