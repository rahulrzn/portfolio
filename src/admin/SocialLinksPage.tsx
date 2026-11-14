import { useFieldArray, useWatch } from 'react-hook-form';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useWorkspace } from '../content/context';
import { socialLinksSchema, type SocialPlatform } from '../content/schema';
import { SocialIcon } from '../components/SocialIcon';
import { Checkbox, EditorForm, Field, useEditor } from './forms';
import { useAdmin } from './workspace';

const formSchema = z.object({ socialLinks: socialLinksSchema });
const platforms: { value: SocialPlatform; label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X' },
];
const hints = {
  github: 'Use https://github.com/your-username',
  linkedin: 'Use https://www.linkedin.com/in/your-profile',
  instagram: 'Use https://www.instagram.com/your-username',
  x: 'Use https://x.com/your-username',
};

export default function SocialLinksPage() {
  const { repository, snapshot } = useWorkspace();
  const { confirm } = useAdmin();
  const form = useEditor(formSchema, {
    socialLinks: [...snapshot.draft.socialLinks].sort((a, b) => a.order - b.order),
  });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'socialLinks',
    keyName: 'editorKey',
  });
  const links = useWatch({ control: form.control, name: 'socialLinks' });
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Social links</h1>
          <p>Your profiles, in the order visitors should discover them.</p>
        </div>
      </header>
      <EditorForm
        form={form}
        onSave={async ({ socialLinks }) => {
          await repository.saveDraft(
            {
              ...repository.read().draft,
              socialLinks: socialLinks.map((link, order) => ({ ...link, order })),
            },
            'Saved social links draft',
          );
        }}
      >
        <section className="admin-panel">
          <h2>Public profiles</h2>
          <p>
            Choose GitHub, LinkedIn, Instagram or X. Changes appear in your hero, contact page and
            footer after publication.
          </p>
          {fields.length ? (
            <div className="admin-social-list">
              {fields.map((row, index) => {
                const link = links[index] ?? row;
                const label =
                  platforms.find((item) => item.value === link.platform)?.label ?? link.platform;
                return (
                  <section
                    className="admin-social-row"
                    key={row.editorKey}
                    aria-label={`${label} link ${index + 1}`}
                  >
                    <div className="admin-entry-heading">
                      <h3>
                        <SocialIcon platform={link.platform} size={20} />
                        {label}
                      </h3>
                      <span className={`admin-badge ${link.enabled ? '' : 'admin-badge-draft'}`}>
                        {link.enabled ? 'Visible after publication' : 'Hidden'}
                      </span>
                    </div>
                    <div className="admin-form-grid">
                      <Field
                        form={form}
                        name={`socialLinks.${index}.platform`}
                        label={`Platform ${index + 1}`}
                        type="select"
                        options={platforms}
                      />
                      <Field
                        form={form}
                        name={`socialLinks.${index}.url`}
                        label={`Profile URL ${index + 1}`}
                        type="url"
                        required
                        hint={hints[link.platform]}
                      />
                    </div>
                    <div className="admin-social-row-footer">
                      <Checkbox
                        form={form}
                        name={`socialLinks.${index}.enabled`}
                        label={`Show link ${index + 1} on the portfolio`}
                      />
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="button small secondary"
                          disabled={index === 0}
                      aria-label={`Move up social link ${index + 1}`}
                          onClick={() => move(index, index - 1)}
                        >
                          <ArrowUp size={15} aria-hidden="true" />
                          Move up
                        </button>
                        <button
                          type="button"
                          className="button small secondary"
                          disabled={index === fields.length - 1}
                      aria-label={`Move down social link ${index + 1}`}
                          onClick={() => move(index, index + 1)}
                        >
                          <ArrowDown size={15} aria-hidden="true" />
                          Move down
                        </button>
                        <button
                          type="button"
                          className="button small secondary admin-remove"
                          aria-label={`Remove social link ${index + 1}`}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: 'Remove social link?',
                                message: `Remove this ${label} profile from the form? Save draft to keep the change. Visitors will see the previous links until you publish.`,
                                action: 'Remove link',
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
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="admin-social-empty">
              <SocialIcon platform="github" size={28} />
              <h3>Add your first profile</h3>
              <p>Give visitors a direct way to explore your work or connect with you.</p>
            </div>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={fields.length >= 16}
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                platform: 'github',
                url: '',
                enabled: true,
                order: fields.length,
              })
            }
          >
            <Plus size={17} aria-hidden="true" />
            Add social link
          </button>
          {form.formState.errors.socialLinks?.message ? (
            <p className="admin-field-error" role="alert">
              {form.formState.errors.socialLinks.message}
            </p>
          ) : null}
        </section>
      </EditorForm>
    </>
  );
}
