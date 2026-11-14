import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { createRepository, type ContentRepository } from '../content/repository';
import { AdminTools } from './workspace';
import AboutPage from './AboutPage';
import ContactPage from './ContactPage';
import SettingsPage from './SettingsPage';
import SocialLinksPage from './SocialLinksPage';

let repository: ContentRepository;
const nativeShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
vi.mock('../content/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/repository')>();
  return { ...actual, getRepository: () => repository };
});
function mount(component: React.ReactNode) {
  render(
    <MemoryRouter>
      <AdminTools>{component}</AdminTools>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  localStorage.clear();
  repository = createRepository(localStorage);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  if (nativeShowModal)
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', nativeShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (nativeClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', nativeClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

describe('scoped portfolio editors', () => {
  it('keeps unsaved education fields attached to the same entry when reordered', async () => {
    const initial = repository.read().draft;
    await repository.saveDraft(
      {
        ...initial,
        profile: {
          ...initial.profile,
          education: [
            { id: 'first-school', school: 'School A', degree: 'Degree A', period: '', detail: '' },
            { id: 'second-school', school: 'School B', degree: 'Degree B', period: '', detail: '' },
          ],
        },
      },
      'Prepare education',
    );
    mount(<AboutPage />);
    fireEvent.change(screen.getByLabelText('School 2'), {
      target: { value: 'Updated second school' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Move up education 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(repository.read().draft.profile.education[0].school).toBe('Updated second school'),
    );
    expect(repository.read().draft.profile.education[0].id).toBe('second-school');
  });
  it('saves the biography and education without replacing identity or contact details', async () => {
    const initial = repository.read().draft;
    await repository.saveDraft(
      {
        ...initial,
        profile: { ...initial.profile, name: 'Keep this name', phone: '+91 98765 43210' },
      },
      'Prepare profile',
    );
    mount(<AboutPage />);
    fireEvent.change(screen.getByLabelText('About'), { target: { value: 'A new biography.' } });
    fireEvent.change(screen.getByLabelText('School 1'), { target: { value: 'Updated school' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(repository.read().draft.profile.about).toBe('A new biography.'));
    expect(repository.read().draft.profile.education[0].school).toBe('Updated school');
    expect(repository.read().draft.profile).toMatchObject({
      name: 'Keep this name',
      phone: '+91 98765 43210',
    });
    expect(repository.read().published.profile.about).not.toBe('A new biography.');
  });

  it('validates a phone number and atomically saves contact copy while preserving site settings', async () => {
    const initial = repository.read().draft;
    await repository.saveDraft(
      { ...initial, settings: { ...initial.settings, footerNote: 'Keep this footer' } },
      'Prepare settings',
    );
    mount(<ContactPage />);
    const phone = screen.getByLabelText('Phone number');
    fireEvent.change(phone, { target: { value: '+1;123456789' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(phone).toHaveAttribute('aria-invalid', 'true'));
    expect(repository.read().draft.profile.phone).toBe('');
    fireEvent.change(phone, { target: { value: '+91 98765 43210' } });
    fireEvent.change(screen.getByLabelText('Contact heading'), {
      target: { value: 'Let us talk about your project' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(repository.read().draft.profile.phone).toBe('+91 98765 43210'));
    expect(repository.read().draft.settings).toMatchObject({
      contactHeading: 'Let us talk about your project',
      footerNote: 'Keep this footer',
    });
    expect(repository.read().published.profile.phone).toBe('');
  });

  it('keeps newer contact changes when saving an already-open Settings form', async () => {
    mount(<SettingsPage />);
    fireEvent.change(screen.getByLabelText('Footer note'), { target: { value: 'A new footer' } });
    await act(async () => {
      const content = repository.read().draft;
      await repository.saveDraft(
        {
          ...content,
          settings: { ...content.settings, contactHeading: 'Keep newer contact copy' },
        },
        'Saved contact elsewhere',
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(repository.read().draft.settings.footerNote).toBe('A new footer'));
    expect(repository.read().draft.settings.contactHeading).toBe('Keep newer contact copy');
  });

  it('validates social platforms and saves stable ordered links with explicit visibility and deletion', async () => {
    mount(<SocialLinksPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Add social link' }));
    const firstUrl = screen.getByLabelText('Profile URL 1');
    fireEvent.change(firstUrl, { target: { value: 'https://instagram.com/test-owner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(firstUrl).toHaveAttribute('aria-invalid', 'true'));
    expect(repository.read().draft.socialLinks).toEqual([]);
    fireEvent.change(firstUrl, { target: { value: 'https://github.com/test-owner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(repository.read().draft.socialLinks).toHaveLength(1));
    const firstId = repository.read().draft.socialLinks[0].id;
    fireEvent.click(screen.getByRole('button', { name: 'Add social link' }));
    fireEvent.change(screen.getByLabelText('Platform 2'), { target: { value: 'linkedin' } });
    fireEvent.change(screen.getByLabelText('Profile URL 2'), {
      target: { value: 'https://www.linkedin.com/in/test-owner' },
    });
    fireEvent.click(screen.getByLabelText('Show link 2 on the portfolio'));
    fireEvent.click(screen.getByRole('button', { name: 'Move up social link 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(repository.read().draft.socialLinks).toHaveLength(2));
    expect(repository.read().draft.socialLinks[0]).toMatchObject({
      platform: 'linkedin',
      enabled: false,
      order: 0,
    });
    expect(repository.read().draft.socialLinks[1]).toMatchObject({
      id: firstId,
      platform: 'github',
      enabled: true,
      order: 1,
    });
    expect(repository.read().published.socialLinks).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove social link 1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove link' }));
    await waitFor(() => expect(screen.queryByLabelText('Profile URL 2')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(repository.read().draft.socialLinks).toHaveLength(1));
    expect(repository.read().draft.socialLinks[0]).toMatchObject({
      id: firstId,
      platform: 'github',
      order: 0,
    });
    expect(repository.read().published.socialLinks).toEqual([]);
  });
});
