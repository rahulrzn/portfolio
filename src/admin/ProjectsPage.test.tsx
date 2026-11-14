import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { createRepository, type ContentRepository } from '../content/repository';
import ProjectsPage from './ProjectsPage';
import { AdminTools } from './workspace';

let repository: ContentRepository;
vi.mock('../content/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/repository')>();
  return { ...actual, getRepository: () => repository };
});
beforeEach(() => {
  localStorage.clear();
  repository = createRepository(localStorage);
});

it('waits for a duplicated project to be saved before opening its editor', async () => {
  const save = repository.saveDraft;
  let complete!: () => void;
  const response = new Promise<void>((resolve) => {
    complete = resolve;
  });
  repository.saveDraft = async (content, label) => {
    await response;
    await save(content, label);
  };
  render(
    <MemoryRouter>
      <AdminTools>
        <ProjectsPage />
      </AdminTools>
    </MemoryRouter>,
  );
  const duplicate = screen.getAllByRole('button', { name: 'Duplicate' })[0];
  fireEvent.click(duplicate);
  await waitFor(() => expect(duplicate).toBeDisabled());
  expect(screen.queryByLabelText('Slug')).not.toBeInTheDocument();
  expect(screen.queryByText(/project duplicated/i)).not.toBeInTheDocument();
  expect(repository.read().draft.projects).toHaveLength(3);
  await act(async () => complete());
  expect(await screen.findByLabelText('Slug')).toHaveValue('soho-suite-copy');
  expect(repository.read().draft.projects).toHaveLength(4);
  expect(repository.read().published.projects).toHaveLength(3);
});
