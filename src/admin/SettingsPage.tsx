import { useState } from 'react';
import { useWorkspace } from '../content/context';
import { settingsSchema } from '../content/schema';
import { downloadFile, exportBackup, importBackup } from '../content/backup';
import { EditorForm, Field, useEditor } from './forms';
import { useAdmin } from './workspace';

export default function SettingsPage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(settingsSchema, snapshot.draft.settings);
  const { confirm, notify, guard } = useAdmin();
  const [busy, setBusy] = useState(false);
  const backup = async () => {
    setBusy(true);
    try {
      downloadFile(
        await exportBackup(repository),
        `rahul-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
      notify('Backup exported with saved draft, published content and uploaded images.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Backup export failed.', true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="admin-page-heading">
        <h1>Settings</h1>
        <p>Manage search details, contact copy and portable backups.</p>
      </header>
      <EditorForm
        form={form}
        onSave={(settings) =>
          repository.saveDraft({ ...repository.read().draft, settings }, 'Saved settings draft')
        }
      >
        <section className="admin-panel">
          <h2>Site details</h2>
          <div className="admin-form-grid">
            <Field form={form} name="seoTitle" label="SEO title" required wide />
            <Field
              form={form}
              name="seoDescription"
              label="SEO description"
              type="textarea"
              required
              wide
            />
            <Field
              form={form}
              name="siteUrl"
              label="Site URL"
              type="url"
              hint="Your deployed website URL. Leave blank until available."
            />
            <Field
              form={form}
              name="resumeUrl"
              label="Resume URL"
              type="url"
              hint="Optional public resume link. Original reference PDFs remain private."
            />
            <Field form={form} name="contactHeading" label="Contact heading" required wide />
            <Field
              form={form}
              name="contactIntro"
              label="Contact introduction"
              type="textarea"
              wide
            />
            <Field form={form} name="footerNote" label="Footer note" wide />
          </div>
        </section>
      </EditorForm>
      <section className="admin-panel">
        <h2>Backup and recovery</h2>
        <p>
          Export a portable copy before clearing browser storage or moving to another browser.
          Imports replace the saved draft; published content stays unchanged until you publish.
        </p>
        <button type="button" className="button secondary" disabled={busy} onClick={backup}>
          Export backup
        </button>
        <div className="admin-field admin-backup">
          <label htmlFor="admin-import">Import backup file</label>
          <input
            id="admin-import"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              if (file.size > 32 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.json')) {
                notify('Choose a JSON backup smaller than 32 MB.', true);
                return;
              }
              await guard(() => {
                void (async () => {
                  if (
                    !(await confirm({
                      title: 'Import into draft?',
                      message:
                        'The backup will replace your saved draft. Public content in this browser stays unchanged. Export a backup first if you need your current draft.',
                      action: 'Import draft',
                    }))
                  )
                    return;
                  setBusy(true);
                  try {
                    await importBackup(await file.text(), repository);
                    form.reset(repository.read().draft.settings);
                    notify('Backup imported into draft. Preview and publish when ready.');
                  } catch (error) {
                    notify(
                      error instanceof Error
                        ? error.message
                        : 'Import failed. No content was changed.',
                      true,
                    );
                  } finally {
                    setBusy(false);
                  }
                })();
              });
            }}
          />
          <small>Versioned JSON backup, up to 32 MB.</small>
        </div>
        {snapshot.warning ? (
          <>
            <p className="admin-warning" role="alert">
              {snapshot.warning}
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                downloadFile(
                  repository.exportDamagedData(),
                  'rahul-damaged-content.txt',
                  'text/plain',
                )
              }
            >
              Export damaged raw data
            </button>
          </>
        ) : null}
      </section>
      <section className="admin-panel admin-reset">
        <h2>Restore original content</h2>
        <p>
          Restore the verified starter content into the draft. This does not publish it or remove
          your uploaded image files.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() =>
            guard(() => {
              void (async () => {
                if (
                  await confirm({
                    title: 'Restore defaults in draft?',
                    message:
                      'Your saved draft will be replaced with the original content. Published content stays unchanged. Export a backup first if needed.',
                    action: 'Restore defaults',
                    destructive: true,
                  })
                ) {
                  try {
                    repository.resetDraft();
                    form.reset(repository.read().draft.settings);
                    notify(
                      'Original defaults restored in draft. Explicit publish is still required.',
                    );
                  } catch (error) {
                    notify(error instanceof Error ? error.message : 'Restore failed.', true);
                  }
                }
              })();
            })
          }
        >
          Restore defaults
        </button>
      </section>
    </>
  );
}
