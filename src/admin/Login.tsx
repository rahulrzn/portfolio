import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Moon, Sun } from 'lucide-react';
import type { Theme } from '../components/ThemeToggle';

export function StudioMark() {
  return (
    <img
      src="/favicon.svg"
      className="admin-brand-monogram"
      width={43}
      height={43}
      alt=""
      aria-hidden="true"
    />
  );
}

export function ThemeControl({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="admin-icon-button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={onToggle}
    >
      {theme === 'dark' ? (
        <Sun size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} aria-hidden="true" />
      )}
    </button>
  );
}

export default function Login({
  onLogin,
  environment,
  theme,
  onToggleTheme,
}: {
  onLogin: (password: string) => Promise<void>;
  environment?: 'local' | 'production';
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [show, setShow] = useState(false);
  const form = useForm({ defaultValues: { password: '' } });
  const error =
    form.formState.errors.password?.message ?? form.formState.errors.root?.server?.message;
  const pending = form.formState.isSubmitting;
  return (
    <main className="admin-login">
      <header className="admin-login-topline">
        <Link to="/" className="admin-login-back">
          View portfolio <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <ThemeControl theme={theme} onToggle={onToggleTheme} />
      </header>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <StudioMark />
        <h1 id="admin-login-title">Portfolio studio</h1>
        <p className="admin-login-lead">
          Sign in to edit your portfolio, review a saved draft and publish when it is ready.
        </p>
        {environment === 'local' ? (
          <p className="admin-environment-note">
            <strong>Local workspace</strong>
            <span>Changes stay in your local development database.</span>
          </p>
        ) : null}
        <form
          noValidate
          aria-busy={pending}
          onSubmit={form.handleSubmit(async ({ password }) => {
            form.clearErrors();
            try {
              await onLogin(password);
            } catch (failure) {
              form.setError('root.server', {
                message: failure instanceof Error ? failure.message : 'Sign-in failed. Try again.',
              });
            }
          })}
        >
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-password">
              <input
                {...form.register('password', {
                  required: 'Enter your admin password.',
                  maxLength: {
                    value: 1024,
                    message: 'Use a password of 1024 characters or fewer.',
                  },
                })}
                id="admin-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                disabled={pending}
                aria-invalid={!!error}
                aria-describedby={error ? 'admin-password-error' : 'admin-password-hint'}
              />
              <button
                type="button"
                disabled={pending}
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((value) => !value)}
              >
                {show ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            <small id="admin-password-hint">
              Use the owner password configured for this portfolio.
            </small>
            {error ? (
              <p id="admin-password-error" className="admin-field-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button admin-login-submit" disabled={pending}>
            <LockKeyhole size={17} aria-hidden="true" />
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="admin-login-foot">Saved drafts stay private until you choose Publish.</p>
      </section>
      <p className="admin-login-owner">
        Rahul Reji R. <span>Portfolio workspace</span>
      </p>
    </main>
  );
}
