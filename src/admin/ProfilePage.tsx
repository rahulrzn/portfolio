import { Controller } from 'react-hook-form';
import { useWorkspace } from '../content/context';
import { profileSchema } from '../content/schema';
import { Checkbox, EditorForm, Field, ImageField, StringList, useEditor } from './forms';
import { useAdmin } from './workspace';

export default function ProfilePage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(profileSchema, snapshot.draft.profile);
  const { confirm } = useAdmin();
  return (
    <>
      <header className="admin-page-heading">
        <h1>Profile</h1>
        <p>Keep your introduction, photograph and education up to date.</p>
      </header>
      <EditorForm
        form={form}
        onSave={(profile) =>
          repository.saveDraft({ ...repository.read().draft, profile }, 'Saved profile draft')
        }
      >
        <section className="admin-panel">
          <h2>Identity</h2>
          <ImageField form={form} name="image" alt="Profile image preview" />
          <div className="admin-form-grid">
            <Field form={form} name="name" label="Name" required />
            <Field form={form} name="headline" label="Headline" required />
            <Field form={form} name="introduction" label="Introduction" type="textarea" wide />
            <Field form={form} name="about" label="About" type="textarea" wide />
            <Field form={form} name="location" label="Location" />
            <Field form={form} name="email" label="Email" type="email" />
            <Field
              form={form}
              name="phone"
              label="Phone number"
              type="tel"
              hint="Optional. Use 7–15 digits, including a country code with + if needed. Spaces, parentheses, dots and hyphens are allowed. Leave blank to hide it."
            />
            <Field
              form={form}
              name="githubUrl"
              label="GitHub URL"
              type="url"
              hint="Use your full https://github.com/… profile URL. Leave blank if unavailable."
            />
            <Field
              form={form}
              name="linkedinUrl"
              label="LinkedIn URL"
              type="url"
              hint="Use your full https://www.linkedin.com/in/… profile URL. Leave blank if unavailable."
            />
          </div>
        </section>
        <section className="admin-panel">
          <h2>Opportunities</h2>
          <p>
            Manage your availability, career interests and location preferences. Save and publish to
            update the public section.
          </p>
          <Checkbox
            form={form}
            name="opportunities.visible"
            label="Show the Open to Opportunities section"
          />
          <div className="admin-form-grid">
            <Field
              form={form}
              name="opportunities.heading"
              label="Opportunities heading"
              required
              wide
            />
            <Field
              form={form}
              name="opportunities.summary"
              label="Opportunities summary"
              type="textarea"
              wide
            />
            <Field
              form={form}
              name="opportunities.flexibility"
              label="Role and domain flexibility"
              type="textarea"
              wide
            />
          </div>
          <StringList
            form={form}
            name="opportunities.careerInterests"
            label="Career interest"
            max={12}
          />
          <p>List preferred locations in priority order, with your first choice at the top.</p>
          <StringList
            form={form}
            name="opportunities.preferredLocations"
            label="Preferred location"
            max={8}
          />
          <StringList
            form={form}
            name="opportunities.employmentTypes"
            label="Employment type"
            max={8}
          />
        </section>
        <section className="admin-panel">
          <h2>Education</h2>
          <Controller
            control={form.control}
            name="education"
            render={({ field, fieldState }) => (
              <>
                {field.value.map((education, index) => (
                  <div className="admin-subsection" key={education.id}>
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
                        onClick={() => {
                          const items = [...field.value];
                          [items[index - 1], items[index]] = [items[index], items[index - 1]];
                          field.onChange(items);
                        }}
                      >
                        Move education {index + 1} up
                      </button>
                      <button
                        className="button small secondary"
                        type="button"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: 'Remove education?',
                              message: `Remove ${education.school || 'this education entry'} from this form? Save draft to keep the change.`,
                              action: 'Remove education',
                              destructive: true,
                            })
                          )
                            field.onChange(field.value.filter((item) => item.id !== education.id));
                        }}
                      >
                        Remove education {index + 1}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="button secondary"
                  type="button"
                  disabled={field.value.length >= 10}
                  onClick={() =>
                    field.onChange([
                      ...field.value,
                      { id: crypto.randomUUID(), school: '', degree: '', period: '', detail: '' },
                    ])
                  }
                >
                  Add education
                </button>
                {fieldState.error ? (
                  <p role="alert" className="admin-field-error">
                    Complete each school and degree.
                  </p>
                ) : null}
              </>
            )}
          />
        </section>
      </EditorForm>
    </>
  );
}
