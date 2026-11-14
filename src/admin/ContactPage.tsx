import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useWorkspace } from '../content/context';
import { profileSchema, settingsSchema } from '../content/schema';
import { EditorForm, Field, useEditor } from './forms';

const contactEditorSchema = z.object({
  email: profileSchema.shape.email,
  phone: profileSchema.shape.phone,
  contactHeading: settingsSchema.shape.contactHeading,
  contactIntro: settingsSchema.shape.contactIntro,
});
export default function ContactPage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(contactEditorSchema, {
    email: snapshot.draft.profile.email,
    phone: snapshot.draft.profile.phone,
    contactHeading: snapshot.draft.settings.contactHeading,
    contactIntro: snapshot.draft.settings.contactIntro,
  });
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Contact</h1>
          <p>Help the right people get in touch.</p>
        </div>
      </header>
      <EditorForm
        form={form}
        onSave={async ({ email, phone, contactHeading, contactIntro }) => {
          const content = repository.read().draft;
          await repository.saveDraft(
            {
              ...content,
              profile: { ...content.profile, email, phone },
              settings: { ...content.settings, contactHeading, contactIntro },
            },
            'Saved contact draft',
          );
        }}
      >
        <section className="admin-panel">
          <h2>Contact details</h2>
          <p>
            Leave a detail blank to hide it from the portfolio. Manage your public profiles in{' '}
            <Link to="/admin/social">Social links</Link>.
          </p>
          <div className="admin-form-grid">
            <Field
              form={form}
              name="email"
              label="Email"
              type="email"
              hint="A public email address for enquiries."
            />
            <Field
              form={form}
              name="phone"
              label="Phone number"
              type="tel"
              hint="Optional. Use 7–15 digits, with a leading + for a country code. Spaces, parentheses, dots and hyphens are allowed."
            />
          </div>
        </section>
        <section className="admin-panel">
          <h2>Contact page</h2>
          <p>A clear heading and invitation set the tone for enquiries.</p>
          <div className="admin-form-grid">
            <Field form={form} name="contactHeading" label="Contact heading" required wide />
            <Field
              form={form}
              name="contactIntro"
              label="Contact introduction"
              type="textarea"
              wide
            />
          </div>
        </section>
      </EditorForm>
    </>
  );
}
