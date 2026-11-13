import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { Logo } from '../common/Logo';
import { signIn as authSignIn, signUp as authSignUp, resetPassword as authResetPassword } from '../../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn?: (email: string, pass: string) => Promise<any>;
  onSignUp?: (email: string, pass: string, fullName: string, username?: string) => Promise<any>;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignIn = authSignIn,
  onSignUp = authSignUp,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
        onSuccess?.();
        onClose();
      } else if (mode === 'signup') {
        const res = await onSignUp(email, password, fullName, username || undefined);
        if (res?.needsEmailConfirmation) {
          setSuccessNotice(
            'Account created! A confirmation link has been sent to your email. Please verify your email to log in.'
          );
        } else {
          onSuccess?.();
          onClose();
        }
      } else if (mode === 'forgot') {
        await authResetPassword(email);
        setSuccessNotice(
          'Password reset email sent! Check your inbox for instructions to reset your password.'
        );
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forestBlack/80 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-phmly-surface border border-phmly-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col transition-colors my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3">
          <Logo size="sm" showWordmark={true} />
          <button
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title and Mode Switcher */}
        <div className="px-5 sm:px-6 pt-1 pb-3">
          {mode === 'forgot' ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-goldenRush font-semibold hover:underline mb-2 focus:outline-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
              <h2 id="auth-modal-title" className="text-xl font-bold text-phmly-text">
                Reset your password
              </h2>
              <p className="text-xs text-phmly-muted mt-0.5">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
          ) : (
            <>
              <h2 id="auth-modal-title" className="text-page-title font-semibold text-phmly-text">
                {mode === 'signin' ? 'Welcome back to PHMLY' : 'Create your account'}
              </h2>
              <p className="text-metadata text-phmly-muted mt-0.5">
                {mode === 'signin'
                  ? 'Sign in to access your private rooms and spaces'
                  : 'Join your friends in private spaces for work and goals'}
              </p>

              {/* Segmented Mode Switcher */}
              <div
                className="flex items-center bg-phmly-subtle p-1 rounded-xl border border-phmly-border mt-3.5"
                role="tablist"
                aria-label="Authentication mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className={`flex-1 py-2 min-h-[38px] rounded-lg text-secondary font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush ${
                    mode === 'signin'
                      ? 'bg-phmly-surface text-phmly-text shadow-xs'
                      : 'text-phmly-muted hover:text-phmly-text'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className={`flex-1 py-2 min-h-[38px] rounded-lg text-secondary font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush ${
                    mode === 'signup'
                      ? 'bg-goldenRush text-forestBlack shadow-xs'
                      : 'text-phmly-muted hover:text-phmly-text'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-6 pt-1 space-y-3.5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 p-3 rounded-2xl text-xs text-rose-500 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div
              role="status"
              className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-2xl text-xs text-emerald-500 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="auth-fullname" className="block text-metadata font-medium text-phmly-muted mb-1">
                  Full Name <span className="text-goldenRush">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-phmly-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-phmly-subtle text-phmly-text text-secondary pl-10 pr-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush focus:ring-1 focus:ring-goldenRush transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-username" className="block text-metadata font-medium text-phmly-muted mb-1">
                  Username (Optional)
                </label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex_rivera"
                  className="w-full bg-phmly-subtle text-phmly-text text-secondary px-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush focus:ring-1 focus:ring-goldenRush transition-colors"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-metadata font-medium text-phmly-muted mb-1">
              Email Address <span className="text-goldenRush">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-phmly-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-phmly-subtle text-phmly-text text-secondary pl-10 pr-3.5 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush focus:ring-1 focus:ring-goldenRush transition-colors"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="text-metadata font-medium text-phmly-muted">
                  Password <span className="text-goldenRush">*</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-caption text-goldenRush hover:underline font-medium focus:outline-none"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-phmly-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-phmly-subtle text-phmly-text text-sm pl-10 pr-10 py-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush focus:ring-1 focus:ring-goldenRush transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-phmly-muted hover:text-phmly-text focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 rounded-xl bg-goldenRush text-forestBlack font-bold text-sm hover:bg-amberGlow transition-transform active:scale-95 shadow-md shadow-goldenRush/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-goldenRush"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Link'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="text-center pt-1">
            <p className="text-[11px] text-phmly-muted">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-goldenRush font-semibold hover:underline focus:outline-none"
                  >
                    Create one now
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                    }}
                    className="text-goldenRush font-semibold hover:underline focus:outline-none"
                  >
                    Log in here
                  </button>
                </>
              ) : (
                <>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                    }}
                    className="text-goldenRush font-semibold hover:underline focus:outline-none"
                  >
                    Return to login
                  </button>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
