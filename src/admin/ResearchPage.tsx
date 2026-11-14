import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useWorkspace } from '../content/context';
import { newResearch } from '../content/defaults';
import { researchSchema, type Research } from '../content/schema';
import { EditorForm, Field, OutcomeList, StringList, useEditor } from './forms';
import { useAdmin } from './workspace';
function ResearchEditor({ research, onClose }: { research: Research; onClose: () => void }) {
  const { repository } = useWorkspace();
  const form = useEditor(researchSchema, research);
  return (
    <EditorForm
      form={form}
      onCancel={onClose}
      onSave={async (value) => {
        const content = repository.read().draft;
        await repository.saveDraft(
          {
            ...content,
            research: content.research.some((item) => item.id === value.id)
              ? content.research.map((item) => (item.id === value.id ? value : item))
              : [...content.research, value],
          },
          `Saved research: ${value.title}`,
        );
      }}
    >
      <section className="admin-panel">
        <h2>Research details</h2>
        <div className="admin-form-grid">
          <Field form={form} name="title" label="Title" required wide />
          <Field form={form} name="description" label="Description" type="textarea" wide />
          <Field form={form} name="date" label="Date or period" />
          <Field form={form} name="publication" label="Publication or conference" />
          <Field form={form} name="link" label="Publication URL" type="url" wide />
          <Field form={form} name="details" label="Details" type="textarea" wide />
          <Field
            form={form}
            name="status"
            label="Status"
            type="select"
            options={[
              { value: 'draft', label: 'Hidden draft' },
              { value: 'published', label: 'Public-ready (appears after Publish)' },
            ]}
          />
          <Field form={form} name="order" label="Display order" type="number" />
        </div>
        <StringList form={form} name="technologies" label="Technology" />
        <OutcomeList form={form} name="outcomes" />
      </section>
    </EditorForm>
  );
}
export default function ResearchPage() {
  const { repository, snapshot } = useWorkspace();
  const [selected, setSelected] = useState<Research | null>(null);
  const { confirm, notify, guard, busy, run } = useAdmin();
  const pending = busy || !!snapshot.pending;
  const items = [...snapshot.draft.research].sort((a, b) => a.order - b.order);
  const move = async (index: number, delta: number) => {
    try {
      const reordered = [...items];
      if (index + delta < 0 || index + delta >= reordered.length) return;
      [reordered[index], reordered[index + delta]] = [reordered[index + delta], reordered[index]];
      await run(async () => {
        await repository.saveDraft(
          {
            ...repository.read().draft,
            research: reordered.map((item, i) => ({ ...item, order: i })),
          },
          'Reordered research',
        );
      });
      notify('Research order saved in draft.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Reordering failed.', true);
    }
  };
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Research</h1>
          <p>Present your research with clear sources and evaluation context.</p>
        </div>
        <button
          className="button"
          type="button"
          disabled={pending || items.length >= 60}
          onClick={() => guard(() => setSelected(newResearch()))}
        >
          <Plus size={17} aria-hidden="true" />
          Add research
        </button>
      </header>
      {selected ? (
        <ResearchEditor key={selected.id} research={selected} onClose={() => setSelected(null)} />
      ) : (
        <div className="admin-collection">
          {items.length ? (
            items.map((research, index) => (
              <article className="admin-project-row" key={research.id}>
                <div className="admin-row-content">
                  <span
                    className={`admin-badge ${research.status === 'draft' ? 'admin-badge-draft' : ''}`}
                  >
                    {research.status === 'draft' ? 'Draft item' : 'Public-ready'}
                  </span>
                  <h2>{research.title}</h2>
                  <p>{research.description}</p>
                  <small>
                    {research.publication}
                    {research.date ? ` · ${research.date}` : ''}
                  </small>
                </div>
                <div className="admin-row-actions">
                  <button
                    className="button small"
                    type="button"
                    disabled={pending}
                    onClick={() => setSelected(research)}
                  >
                    Edit
                  </button>
                  <button
                    className="button small secondary"
                    type="button"
                    aria-label={`Move ${research.title} up`}
                    disabled={pending || !index}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={15} aria-hidden="true" />
                    Up
                  </button>
                  <button
                    className="button small secondary"
                    type="button"
                    aria-label={`Move ${research.title} down`}
                    disabled={pending || index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                    Down
                  </button>
                  <button
                    className="button small secondary admin-remove"
                    type="button"
                    disabled={pending}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Delete research?',
                          message: `Delete ${research.title} from the draft? Public content changes only after Publish.`,
                          action: 'Delete research',
                          destructive: true,
                        })
                      ) {
                        try {
                          const content = repository.read().draft;
                          await run(async () => {
                            await repository.saveDraft(
                              {
                                ...content,
                                research: content.research.filter(
                                  (item) => item.id !== research.id,
                                ),
                              },
                              `Deleted research: ${research.title}`,
                            );
                          }, 'Deleting research…');
                          notify('Research deleted from draft.');
                        } catch (error) {
                          notify(error instanceof Error ? error.message : 'Delete failed.', true);
                        }
                      }
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <section className="admin-panel">
              <h2>No research yet</h2>
              <p>Add a research entry when you have verified details to share.</p>
            </section>
          )}
        </div>
      )}
    </>
  );
}
