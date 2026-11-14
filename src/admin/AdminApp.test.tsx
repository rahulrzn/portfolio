import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminApp from './AdminApp';
import { defaults } from '../content/defaults';

const session = { authenticated: true, csrfToken: 'test-csrf', environment: 'local' as const };
const envelope = {
  version: 1,
  revision: 1,
  updatedAt: '2026-11-14T10:00:00.000Z',
  draft: structuredClone(defaults),
  published: structuredClone(defaults),
  activity: [],
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mount(path = '/admin/login') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal('scrollTo', () => undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('server authenticated workspace', () => {
  it('keeps unsaved form text through an expired session and lets the owner sign in again without leaving', async () => {
    let writes = 0;
    let savedName = '';
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/api/auth/session')) return json(session);
      if (path.endsWith('/api/auth/login')) return json(session);
      if (path.endsWith('/api/admin/content') && init?.method === 'PUT') {
        writes += 1;
        if (writes === 1)
          return json(
            { error: 'Your session expired. Sign in again to save.', code: 'SESSION_EXPIRED' },
            401,
          );
        const content = JSON.parse(String(init.body)).content;
        savedName = content.profile.name;
        return json({ ...envelope, revision: 2, draft: content });
      }
      if (path.endsWith('/api/admin/content')) return json(envelope);
      throw new Error(`Unexpected request: ${path}`);
    });
    mount('/admin/profile');
    const name = await screen.findByLabelText('Name');
    fireEvent.change(name, { target: { value: 'Preserve this profile' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('form', { name: 'Sign in again' })).toBeVisible();
    expect(name).toHaveValue('Preserve this profile');
    fireEvent.change(screen.getByLabelText('Password to continue'), {
      target: { value: 'renewed-test-session' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
    await waitFor(() =>
      expect(screen.queryByRole('form', { name: 'Sign in again' })).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Preserve this profile');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(savedName).toBe('Preserve this profile'));
    expect(writes).toBe(2);
  });
  it('keeps the restored workspace open when navigating between editors', async () => {
    let contentLoads = 0;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/api/auth/session')) return json(session);
      if (path.endsWith('/api/admin/content')) {
        contentLoads += 1;
        return json(envelope);
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    mount('/admin/dashboard');
    const navigation = await screen.findByRole('navigation', { name: 'Workspace sections' });
    fireEvent.click(navigation.querySelector('a[href="/admin/profile"]')!);
    expect(await screen.findByLabelText('Name')).toHaveValue('Rahul Reji R.');
    expect(contentLoads).toBe(1);
  });
  it('restores a valid server session and waits for private content before opening an editor', async () => {
    let loadContent!: (value: Response) => void;
    let requestedContent = false;
    const pendingContent = new Promise<Response>((resolve) => {
      loadContent = resolve;
    });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/api/auth/session')) return json(session);
      if (path.endsWith('/api/admin/content')) {
        requestedContent = true;
        return pendingContent;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    mount('/admin/profile');
    await waitFor(() => expect(requestedContent).toBe(true));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    await act(async () => loadContent(json(envelope)));
    expect(await screen.findByLabelText('Name')).toHaveValue('Rahul Reji R.');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });

  it('keeps an incorrect password on the sign-in form and opens the workspace only after server acceptance', async () => {
    let attempts = 0;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/api/auth/session'))
        return json({ authenticated: false, environment: 'local' });
      if (path.endsWith('/api/auth/login')) {
        attempts += 1;
        const password = JSON.parse(String(init?.body)).password;
        return password === 'correct-test-password'
          ? json(session)
          : json({ error: 'The password is incorrect. Try again.', code: 'INVALID_PASSWORD' }, 401);
      }
      if (path.endsWith('/api/admin/content')) return json(envelope);
      throw new Error(`Unexpected request: ${path}`);
    });
    mount();
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    fireEvent.change(password, { target: { value: 'any-eight-character-phrase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/password is incorrect/);
    expect(password).toHaveValue('any-eight-character-phrase');
    expect(
      screen.queryByRole('navigation', { name: 'Workspace sections' }),
    ).not.toBeInTheDocument();
    fireEvent.change(password, { target: { value: 'correct-test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('navigation', { name: 'Workspace sections' })).toBeVisible();
    expect(attempts).toBe(2);
  });

  it('shows a recoverable configuration failure without opening an insecure editor', async () => {
    let ready = false;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/api/auth/session'))
        return ready
          ? json({ authenticated: false, environment: 'local' })
          : json(
              {
                error:
                  'The admin password has not been configured. Set up the server password, then try again.',
                code: 'AUTH_NOT_CONFIGURED',
              },
              503,
            );
      throw new Error(`Unexpected request: ${path}`);
    });
    mount('/admin/profile');
    expect(await screen.findByRole('alert')).toHaveTextContent(/password has not been configured/);
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    ready = true;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Password')).toBeEnabled();
  });
});
