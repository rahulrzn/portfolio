import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EditorForm, Field, useEditor } from './forms';
import { AdminTools, useAdmin } from './workspace';

const schema = z.object({ name: z.string().trim().min(1, 'A name is required.') });

function TestEditor({ save }: { save: (value: { name: string }) => Promise<void> }) {
  const form = useEditor(schema, { name: 'Saved name' });
  const { dirty } = useAdmin();
  return (
    <>
      <output aria-label="Unsaved editor state">{dirty ? 'dirty' : 'saved'}</output>
      <EditorForm form={form} onSave={save}>
        <Field form={form} name="name" label="Name" />
      </EditorForm>
    </>
  );
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  // A deliberately rejected transport response must not become an unhandled test rejection.
  void promise.catch(() => undefined);
  return { promise, resolve, reject };
}

describe('saved draft editor', () => {
  it('keeps edits dirty and blocks conflicting edits until the server confirms a save', async () => {
    const response = deferred();
    let savedName = '';
    render(
      <AdminTools>
        <TestEditor
          save={async (value) => {
            await response.promise;
            savedName = value.name;
          }}
        />
      </AdminTools>,
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeDisabled());
    expect(screen.getByLabelText('Unsaved editor state')).toHaveTextContent('dirty');
    expect(screen.queryByText(/draft saved/i)).not.toBeInTheDocument();
    expect(savedName).toBe('');
    await act(async () => response.resolve());
    await waitFor(() =>
      expect(screen.getByLabelText('Unsaved editor state')).toHaveTextContent('saved'),
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Updated name');
    expect(screen.getByLabelText('Name')).toBeEnabled();
    expect(savedName).toBe('Updated name');
  });

  it('retains unsaved text and permits retry after a failed server save', async () => {
    const response = deferred();
    let attempts = 0;
    render(
      <AdminTools>
        <TestEditor
          save={async () => {
            attempts += 1;
            if (attempts === 1) await response.promise;
          }}
        />
      </AdminTools>,
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Keep this text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await act(async () =>
      response.reject(new Error('Your session expired. Sign in again to save these edits.')),
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/session expired/));
    expect(screen.getByLabelText('Name')).toHaveValue('Keep this text');
    expect(screen.getByLabelText('Unsaved editor state')).toHaveTextContent('dirty');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Unsaved editor state')).toHaveTextContent('saved'),
    );
    expect(attempts).toBe(2);
  });
});
