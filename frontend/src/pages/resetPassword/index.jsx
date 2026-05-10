import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FolderKanban, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '../../api/authApi';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
        <div className="w-full max-w-md rounded-xl bg-surface-card border border-border p-8 shadow-2xl text-center space-y-4">
          <p className="text-sm font-medium text-text-primary">Invalid reset link</p>
          <p className="text-sm text-text-secondary">This link is missing a token. Please request a new one.</p>
          <Link to="/forgot-password" className="block text-sm text-primary-600 hover:underline">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      navigate('/login', { state: { message: 'Password updated. You can now log in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset link. Please request a new one.');
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
          <p className="mt-1 text-sm text-white/60">Set a new password</p>
        </div>

        <div className="rounded-xl bg-surface-card border border-border p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-text-primary mb-1">New password</h2>
              <p className="text-sm text-text-secondary">Choose a password with at least 8 characters.</p>
            </div>

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-500">{error}</div>
            )}

            <div>
              <label htmlFor="rp-password" className="mb-1.5 block text-sm font-medium text-text-primary">
                New Password
              </label>
              <div className="relative">
                <input
                  id="rp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full rounded-lg border border-border-dark bg-surface px-3.5 py-2.5 pr-10 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="rp-confirm" className="mb-1.5 block text-sm font-medium text-text-primary">
                Confirm Password
              </label>
              <input
                id="rp-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                className="w-full rounded-lg border border-border-dark bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Updating...' : 'Set New Password'}
            </button>

            <Link to="/login" className="block text-center text-sm text-text-secondary hover:text-text-primary transition-colors">
              Back to login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
