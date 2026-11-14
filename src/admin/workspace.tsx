import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { ApiError } from '../content/api';

type Confirmation = {
  title: string;
  message: string;
  action: string;
  cancel?: string;
  destructive?: boolean;
};
type Tools = {
  dirty: boolean;
  busy: boolean;
  operation: string;
  authenticationRequired: boolean;
  clearAuthenticationRequirement: () => void;
  setDirty: (dirty: boolean) => void;
  confirm: (options: Confirmation) => Promise<boolean>;
  notify: (text: string, error?: boolean) => void;
  run: (action: () => void | Promise<void>, label?: string) => Promise<void>;
  guard: (action: () => void | Promise<void>) => Promise<void>;
};
const ToolsContext = createContext<Tools | null>(null);
export function useAdmin() {
  const value = useContext(ToolsContext);
  if (!value) throw new Error('Admin tools unavailable');
  return value;
}
export function AdminTools({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState('');
  const [authenticationRequired, setAuthenticationRequired] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState({ text: '', error: false, id: 0 });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const focus = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, busy]);
  useEffect(() => {
    if (confirmation) {
      focus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    }
  }, [confirmation]);
  const finish = (value: boolean) => {
    dialog.current?.close();
    resolver.current?.(value);
    resolver.current = null;
    setConfirmation(null);
    focus.current?.focus();
  };
  const confirm = (options: Confirmation) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setConfirmation(options);
    });
  const notify = (text: string, error = false) =>
    setNotice((previous) => ({ text, error, id: previous.id + 1 }));
  const run = async (action: () => void | Promise<void>, label = 'Saving changes…') => {
    if (busyRef.current) throw new Error('Wait for the current action to finish, then try again.');
    busyRef.current = true;
    setBusy(true);
    setOperation(label);
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setAuthenticationRequired(true);
      throw error;
    } finally {
      busyRef.current = false;
      setBusy(false);
      setOperation('');
    }
  };
  const guard = async (action: () => void | Promise<void>) => {
    if (busyRef.current) {
      notify('Wait for the current action to finish before leaving this screen.', true);
      return;
    }
    if (
      dirty &&
      !(await confirm({
        title: 'Discard unsaved changes?',
        message:
          'Your unsaved form changes have not been saved to the draft. Discard them to continue?',
        action: 'Discard changes',
        cancel: 'Keep editing',
        destructive: true,
      }))
    )
      return;
    await action();
  };
  return (
    <ToolsContext
      value={{
        dirty,
        busy,
        operation,
        authenticationRequired,
        clearAuthenticationRequirement: () => setAuthenticationRequired(false),
        setDirty,
        confirm,
        notify,
        run,
        guard,
      }}
    >
      {children}
      {notice.text ? (
        <motion.div
          key={notice.id}
          className={`admin-toast ${notice.error ? 'admin-error' : ''}`}
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
          <button
            type="button"
            onClick={() => setNotice((previous) => ({ ...previous, text: '' }))}
            aria-label="Dismiss notification"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </motion.div>
      ) : null}
      <dialog
        ref={dialog}
        className="admin-dialog"
        aria-labelledby="admin-dialog-title"
        aria-describedby={confirmation ? 'admin-dialog-description' : undefined}
        onCancel={(event) => {
          event.preventDefault();
          finish(false);
        }}
        onClick={(event) => {
          if (event.target === dialog.current) finish(false);
        }}
      >
        {confirmation ? (
          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 id="admin-dialog-title">{confirmation.title}</h2>
            <p id="admin-dialog-description">{confirmation.message}</p>
            <div className="admin-actions">
              <button
                autoFocus
                type="button"
                className="button secondary"
                onClick={() => finish(false)}
              >
                {confirmation.cancel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={`button ${confirmation.destructive ? 'admin-danger' : ''}`}
                onClick={() => finish(true)}
              >
                {confirmation.action}
              </button>
            </div>
          </motion.div>
        ) : null}
      </dialog>
    </ToolsContext>
  );
}
