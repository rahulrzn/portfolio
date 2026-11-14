import { Link } from 'react-router-dom';
import { useWorkspace } from '../content/context';
import { profileSchema } from '../content/schema';
import { Checkbox, EditorForm, Field, ImageField, StringList, useEditor } from './forms';

const profileEditorSchema = profileSchema.pick({
  name: true,
  headline: true,
  introduction: true,
  location: true,
  image: true,
  opportunities: true,
});
export default function ProfilePage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(
    profileEditorSchema,
    profileEditorSchema.parse({
      name: snapshot.draft.profile.name,
      headline: snapshot.draft.profile.headline,
      introduction: snapshot.draft.profile.introduction,
      location: snapshot.draft.profile.location,
      image: snapshot.draft.profile.image,
      opportunities: snapshot.draft.profile.opportunities,
    }),
  );
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Profile</h1>
          <p>Your introduction, portrait and availability across the portfolio.</p>
        </div>
      </header>
      <EditorForm
        form={form}
        onSave={async (fields) => {
          const content = repository.read().draft;
          await repository.saveDraft(
            { ...content, profile: { ...content.profile, ...fields } },
            'Saved profile draft',
          );
        }}
      >
        <section className="admin-panel">
          <h2>Your introduction</h2>
          <p>
            Keep the essentials clear. Your biography and education live in{' '}
            <Link to="/admin/about">About</Link>; email and phone live in{' '}
            <Link to="/admin/contact">Contact</Link>.
          </p>
          <ImageField form={form} name="image" alt="Profile image preview" />
          <div className="admin-form-grid">
            <Field form={form} name="name" label="Name" required />
            <Field form={form} name="headline" label="Headline" required />
            <Field form={form} name="introduction" label="Introduction" type="textarea" wide />
            <Field
              form={form}
              name="location"
              label="Location"
              hint="The location shown with your public profile."
              wide
            />
          </div>
        </section>
        <section className="admin-panel">
          <h2>Open to Opportunities</h2>
          <p>Tell visitors which roles, locations and working arrangements you are considering.</p>
          <Checkbox
            form={form}
            name="opportunities.visible"
            label="Show the Open to Opportunities section"
          />
          <div className="admin-form-grid admin-spaced-grid">
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
          <p className="admin-list-guidance">
            List locations in priority order, with your first choice at the top.
          </p>
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
      </EditorForm>
    </>
  );
}
