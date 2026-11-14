import { Download, History, RotateCcw } from 'lucide-react';
import { useWorkspace } from '../content/context';
import { settingsSchema } from '../content/schema';
import { downloadFile, exportBackup, importBackup } from '../content/backup';
import { readLegacyBackup } from '../content/legacyMigration';
import { EditorForm, Field, useEditor } from './forms';
import { useAdmin } from './workspace';

const siteEditorSchema = settingsSchema.pick({
  seoTitle: true,
  seoDescription: true,
  siteUrl: true,
  resumeUrl: true,
  footerNote: true,
});
const pickSettings = (settings: typeof settingsSchema._output) => ({
  seoTitle: settings.seoTitle,
  seoDescription: settings.seoDescription,
  siteUrl: settings.siteUrl,
  resumeUrl: settings.resumeUrl,
  footerNote: settings.footerNote,
});
const filename = (suffix = '') =>
  `rahul-portfolio-backup${suffix}-${new Date().toISOString().slice(0, 10)}.json`;

export default function SettingsPage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(siteEditorSchema, pickSettings(snapshot.draft.settings));
  const { confirm, notify, guard, busy, run, setDirty } = useAdmin();
  const pending = busy || !!snapshot.pending;
  const backup = async () => {
    try {
      await run(
        async () => downloadFile(await exportBackup(repository), filename()),
        'Preparing backup…',
      );
      notify('Backup exported with the saved draft, published content and images.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Backup export failed. Try again.', true);
    }
  };
  const importLegacy = async () => {
    await guard(async () => {
      if (
        !(await confirm({
          title: 'Import content from this browser?',
          message:
            'Backups of your current workspace and the saved browser content download first. The browser draft then replaces your current saved draft. Nothing is published or removed from this browser.',
          action: 'Import browser content',
        }))
      )
        return;
      try {
        await run(async () => {
          const raw = await readLegacyBackup();
          if (!raw) {
            notify(
              'No saved portfolio content was found in this browser. Open the browser you used for the previous workspace and try again.',
            );
            return;
          }
          downloadFile(await exportBackup(repository), filename('-before-browser-import'));
          downloadFile(raw, filename('-legacy-browser'));
          await importBackup(raw, repository);
          form.reset(pickSettings(repository.read().draft.settings));
          setDirty(false);
          notify('Browser content imported into your saved draft. Preview before publishing.');
        }, 'Importing browser content…');
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : 'Browser import failed. Your saved draft was not changed.',
          true,
        );
      }
    });
  };
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Settings</h1>
          <p>Search details, site links and a safe copy of your work.</p>
        </div>
      </header>
      <EditorForm
        form={form}
        onSave={async (fields) => {
          const content = repository.read().draft;
          await repository.saveDraft(
            { ...content, settings: { ...content.settings, ...fields } },
            'Saved settings draft',
          );
        }}
      >
        <section className="admin-panel">
          <h2>Search and site details</h2>
          <p>Control how your portfolio is described and which public links it uses.</p>
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
              hint="The complete address of your public portfolio."
            />
            <Field
              form={form}
              name="resumeUrl"
              label="Resume URL"
              type="url"
              hint="Optional. Leave blank to use the resume generated from published content."
            />
            <Field form={form} name="footerNote" label="Footer note" wide />
          </div>
        </section>
      </EditorForm>
      <section className="admin-panel">
        <h2>Backup and recovery</h2>
        <p>
          A portable backup includes your saved draft, published content and images. Keep a copy
          before replacing content. Imports stay in the draft until you choose Publish.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() => void backup()}
        >
          <Download size={17} aria-hidden="true" />
          Export backup
        </button>
        <div className="admin-field admin-backup">
          <label htmlFor="admin-import">Import backup file</label>
          <input
            id="admin-import"
            type="file"
            accept=".json,application/json"
            disabled={pending}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              if (file.size > 32 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.json')) {
                notify('Choose a JSON backup smaller than 32 MB.', true);
                return;
              }
              await guard(async () => {
                if (
                  !(await confirm({
                    title: 'Import backup into draft?',
                    message:
                      'This backup replaces your complete saved draft. Published content stays unchanged. Export your current workspace first if you need to keep it.',
                    action: 'Import draft',
                  }))
                )
                  return;
                try {
                  await run(async () => {
                    await importBackup(await file.text(), repository);
                    form.reset(pickSettings(repository.read().draft.settings));
                    setDirty(false);
                  }, 'Importing backup…');
                  notify('Backup imported into your saved draft. Preview before publishing.');
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : 'Import failed. Your saved draft was not changed.',
                    true,
                  );
                }
              });
            }}
          />
          <small>Versioned JSON backup, up to 32 MB.</small>
        </div>
        {snapshot.warning && repository.exportDamagedData() ? (
          <div className="admin-backup">
            <p className="admin-empty-copy">
              The server returned content that could not be read safely. Export the response for
              recovery.
            </p>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                downloadFile(
                  repository.exportDamagedData(),
                  'rahul-content-recovery.txt',
                  'text/plain',
                )
              }
            >
              Export recovery data
            </button>
          </div>
        ) : null}
      </section>
      <section className="admin-panel">
        <h2>Import from the previous workspace</h2>
        <p>
          If you edited this portfolio in the old browser workspace, bring that saved draft into
          this workspace. The import downloads backups first and keeps your original browser data.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() => void importLegacy()}
        >
          <History size={17} aria-hidden="true" />
          Import browser content
        </button>
      </section>
      <section className="admin-panel admin-reset">
        <h2>Restore original content</h2>
        <p>
          Replace your saved draft with the verified starter content. Published content and uploaded
          images stay available.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() =>
            void guard(async () => {
              if (
                !(await confirm({
                  title: 'Restore defaults in draft?',
                  message:
                    'This replaces your complete saved draft with the original portfolio content. It does not publish. Export a backup first if you want to keep your edits.',
                  action: 'Restore defaults',
                  destructive: true,
                }))
              )
                return;
              try {
                await run(async () => {
                  await repository.resetDraft();
                }, 'Restoring draft…');
                form.reset(pickSettings(repository.read().draft.settings));
                setDirty(false);
                notify('Original content restored in draft. Preview before publishing.');
              } catch (error) {
                notify(error instanceof Error ? error.message : 'Restore failed. Try again.', true);
              }
            })
          }
        >
          <RotateCcw size={17} aria-hidden="true" />
          Restore defaults
        </button>
      </section>
    </>
  );
}
