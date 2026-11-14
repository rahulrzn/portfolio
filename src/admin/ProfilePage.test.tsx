import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { AdminTools } from './workspace';
import { createRepository, type ContentRepository } from '../content/repository';

let repository: ContentRepository;
vi.mock('../content/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/repository')>();
  return { ...actual, getRepository: () => repository };
});
beforeEach(() => {
  localStorage.clear();
  repository = createRepository(localStorage);
});

it('stages opportunities without publishing or replacing About and Contact fields', async () => {
  const initial = repository.read().draft;
  await repository.saveDraft(
    {
      ...initial,
      profile: {
        ...initial.profile,
        about: 'Keep this biography.',
        email: 'owner@example.com',
        phone: '+91 98765 43210',
      },
    },
    'Set up test content',
  );
  render(
    <MemoryRouter>
      <AdminTools>
        <ProfilePage />
      </AdminTools>
    </MemoryRouter>,
  );
  const availability = screen.getByLabelText('Show the Open to Opportunities section');
  fireEvent.click(availability);
  fireEvent.change(screen.getByLabelText('Opportunities heading'), {
    target: { value: 'Future career opportunities' },
  });
  fireEvent.change(screen.getByLabelText('Preferred location 1'), { target: { value: 'Chennai' } });
  fireEvent.change(screen.getByLabelText('Preferred location 3'), {
    target: { value: 'Bangalore' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(repository.read().draft.profile.opportunities.visible).toBe(false));
  expect(repository.read().draft.profile).toMatchObject({
    about: 'Keep this biography.',
    email: 'owner@example.com',
    phone: '+91 98765 43210',
  });
  expect(repository.read().draft.profile.opportunities.preferredLocations).toEqual([
    'Chennai',
    'Kerala',
    'Bangalore',
  ]);
  expect(repository.read().published.profile.opportunities.visible).toBe(true);
  await repository.publish();
  expect(repository.read().published.profile.opportunities).toMatchObject({
    visible: false,
    heading: 'Future career opportunities',
    preferredLocations: ['Chennai', 'Kerala', 'Bangalore'],
  });
});
