import { useFieldArray, useWatch } from 'react-hook-form';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../content/context';
import { profileSchema } from '../content/schema';
import { EditorForm, Field, useEditor } from './forms';
import { useAdmin } from './workspace';

const aboutEditorSchema = profileSchema.pick({ about: true, education: true });
export default function AboutPage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(aboutEditorSchema, {
    about: snapshot.draft.profile.about,
    education: snapshot.draft.profile.education,
  });
  const { confirm } = useAdmin();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'education',
    keyName: 'editorKey',
  });
  const education = useWatch({ control: form.control, name: 'education' });
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>About</h1>
          <p>The background and education behind your work.</p>
        </div>
      </header>
      <EditorForm
        form={form}
        onSave={async (changes) => {
          const content = repository.read().draft;
          await repository.saveDraft(
            { ...content, profile: { ...content.profile, ...changes } },
            'Saved about draft',
          );
        }}
      >
        <section className="admin-panel">
          <h2>Your biography</h2>
          <p>Give visitors a concise picture of your interests, experience and approach.</p>
          <Field form={form} name="about" label="About" type="textarea" wide />
        </section>
        <section className="admin-panel">
          <h2>Education</h2>
          <p>Arrange entries in the order you want visitors to see them.</p>
          {fields.length ? (
            fields.map((row, index) => {
              const entry = education[index] ?? row;
              return (
                <div className="admin-subsection" key={row.editorKey}>
                  <div className="admin-entry-heading">
                    <h3>{entry.school || `Education ${index + 1}`}</h3>
                    <span>
                      {index + 1} of {fields.length}
                    </span>
                  </div>
                  <div className="admin-form-grid">
                    <Field
                      form={form}
                      name={`education.${index}.school`}
                      label={`School ${index + 1}`}
                      required
                    />
                    <Field
                      form={form}
                      name={`education.${index}.degree`}
                      label={`Degree ${index + 1}`}
                      required
                    />
                    <Field
                      form={form}
                      name={`education.${index}.period`}
                      label={`Period ${index + 1}`}
                    />
                    <Field
                      form={form}
                      name={`education.${index}.detail`}
                      label={`Education details ${index + 1}`}
                    />
                  </div>
                  <div className="admin-actions">
                    <button
                      className="button small secondary"
                      type="button"
                      disabled={index === 0}
                      aria-label={`Move up education ${index + 1}`}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                      Move up
                    </button>
                    <button
                      className="button small secondary"
                      type="button"
                      disabled={index === fields.length - 1}
                      aria-label={`Move down education ${index + 1}`}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                      Move down
                    </button>
                    <button
                      className="button small secondary admin-remove"
                      type="button"
                      aria-label={`Remove education ${index + 1}`}
                      onClick={async () => {
                        if (
                          await confirm({
                            title: 'Remove education?',
                            message: `Remove ${entry.school || 'this education entry'} from this form? Save draft to keep the change.`,
                            action: 'Remove education',
                            destructive: true,
                          })
                        )
                          remove(index);
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="admin-empty-copy">
              No education entries yet. Add a school and degree to begin.
            </p>
          )}
          <button
            className="button secondary"
            type="button"
            disabled={fields.length >= 10}
            onClick={() =>
              append({ id: crypto.randomUUID(), school: '', degree: '', period: '', detail: '' })
            }
          >
            <Plus size={17} aria-hidden="true" />
            Add education
          </button>
          {form.formState.errors.education ? (
            <p role="alert" className="admin-field-error">
              Complete each school and degree before saving.
            </p>
          ) : null}
        </section>
      </EditorForm>
    </>
  );
}
