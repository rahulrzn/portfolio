import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAdmin } from './workspace';

export default function SessionRenewal({
  onSignIn,
}: {
  onSignIn: (password: string) => Promise<void>;
}) {
  const { busy, run, notify, clearAuthenticationRequirement } = useAdmin();
  const [show, setShow] = useState(false);
  const form = useForm({ defaultValues: { password: '' } });
  const error =
    form.formState.errors.password?.message ?? form.formState.errors.root?.server?.message;
  return (
    <section className="admin-session-renewal" aria-labelledby="admin-renewal-title">
      <div>
        <h2 id="admin-renewal-title">Sign in again to keep editing</h2>
        <p>Your session expired. Your unsaved form text is still here.</p>
      </div>
      <form
        aria-label="Sign in again"
        noValidate
        onSubmit={form.handleSubmit(async ({ password }) => {
          form.clearErrors();
          try {
            await run(async () => {
              await onSignIn(password);
              clearAuthenticationRequirement();
            }, 'Signing in…');
            notify('Signed in again. Your unsaved changes are ready to save.');
          } catch (failure) {
            form.setError('root.server', {
              message: failure instanceof Error ? failure.message : 'Sign-in failed. Try again.',
            });
          }
        })}
      >
        <div className="admin-field">
          <label htmlFor="admin-renewal-password">Password to continue</label>
          <div className="admin-password">
            <input
              {...form.register('password', {
                required: 'Enter your admin password.',
                maxLength: { value: 1024, message: 'Use a password of 1024 characters or fewer.' },
              })}
              id="admin-renewal-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={error ? 'admin-renewal-error' : undefined}
            />
            <button
              type="button"
              disabled={busy}
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((value) => !value)}
            >
              {show ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </div>
          {error ? (
            <small id="admin-renewal-error" className="admin-field-error" role="alert">
              {error}
            </small>
          ) : null}
        </div>
        <button type="submit" className="button" disabled={busy}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in again'}
        </button>
      </form>
    </section>
  );
}
