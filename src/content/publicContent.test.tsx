import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createCloudRepository } from './cloudRepository';
import { defaults } from './defaults';
import { ContentProvider, useContent } from './context';
import { ProfileLinks } from '../components/ProfileLinks';

const state = vi.hoisted(() => ({ repository: undefined as unknown }));
vi.mock('./repository', () => ({ getRepository: () => state.repository }));

beforeEach(() => { state.repository = createCloudRepository(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Probe() { return <h1>{useContent().profile.name}</h1>; }

describe('public cloud content', () => {
  it('loads published content before displaying a profile and never paints bundled defaults as current data', async () => {
    const content = { ...defaults, profile: { ...defaults.profile, name: 'Profile from D1' } };
    vi.stubGlobal('fetch', async () => Response.json({ content, revision: 7, updatedAt: '2026-11-14T00:00:00.000Z' }));
    render(<ContentProvider><Probe /></ContentProvider>);
    expect(screen.queryByRole('heading', { name: 'Rahul Reji R.' })).toBeNull();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profile from D1' })).toBeInTheDocument());
  });

  it('renders only enabled social profiles in their configured order', async () => {
    const content = { ...defaults, socialLinks: [
      { id: 'social-github', platform: 'github', url: 'https://github.com/rahul', enabled: true, order: 2 },
      { id: 'social-hidden', platform: 'linkedin', url: 'https://linkedin.com/in/rahul', enabled: false, order: 0 },
      { id: 'social-instagram', platform: 'instagram', url: 'https://instagram.com/rahul.reji', enabled: true, order: 1 },
    ] };
    vi.stubGlobal('fetch', async () => Response.json({ content, revision: 8, updatedAt: '2026-11-14T00:00:00.000Z' }));
    render(<ContentProvider><ProfileLinks /></ContentProvider>);
    await waitFor(() => expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/rahul'));
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Instagram', 'GitHub']);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('offers a retry when no published content has been received', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('offline'); });
    render(<ContentProvider><Probe /></ContentProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Rahul Reji R.' })).toBeNull();
  });
});
