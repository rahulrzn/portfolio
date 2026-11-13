import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { useWorkspace } from '../content/context';
import { skillGroupSchema } from '../content/schema';
import { EditorForm, NestedText, useEditor } from './forms';
import { useAdmin } from './workspace';
const skillsFormSchema = z.object({ skills: z.array(skillGroupSchema).max(20) });
export default function SkillsPage() {
  const { repository, snapshot } = useWorkspace();
  const form = useEditor(skillsFormSchema, { skills: snapshot.draft.skills });
  const { confirm } = useAdmin();
  return (
    <>
      <header className="admin-page-heading">
        <h1>Skills</h1>
        <p>Organize the tools and capabilities you want to show.</p>
      </header>
      <EditorForm
        form={form}
        onSave={(value) =>
          repository.saveDraft(
            { ...repository.read().draft, skills: value.skills },
            'Saved skills draft',
          )
        }
      >
        <Controller
          control={form.control}
          name="skills"
          render={({ field, fieldState }) => {
            const update = (index: number, change: Partial<(typeof field.value)[number]>) =>
              field.onChange(
                field.value.map((group, i) => (i === index ? { ...group, ...change } : group)),
              );
            const move = (index: number, delta: number) => {
              const values = [...field.value];
              [values[index], values[index + delta]] = [values[index + delta], values[index]];
              field.onChange(values);
            };
            return (
              <>
                <div className="admin-category-list">
                  {field.value.map((group, index) => (
                    <section className="admin-panel" key={group.id}>
                      <NestedText
                        form={form}
                        name={`skills.${index}.category`}
                        label={`Category ${index + 1}`}
                        value={group.category}
                        onChange={(category) => update(index, { category })}
                      />
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="button small secondary"
                          aria-label={`Move category ${index + 1} up`}
                          disabled={!index}
                          onClick={() => move(index, -1)}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className="button small secondary"
                          aria-label={`Move category ${index + 1} down`}
                          disabled={index === field.value.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          className="button small secondary"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: 'Remove skill category?',
                                message: `Remove ${group.category || 'this category'} and all its skills from this form? Save draft to keep the change.`,
                                action: 'Remove category',
                                destructive: true,
                              })
                            )
                              field.onChange(field.value.filter((item) => item.id !== group.id));
                          }}
                        >
                          Remove category {index + 1}
                        </button>
                      </div>
                      <div className="admin-skills">
                        {group.items.map((skill, skillIndex) => (
                          <div className="admin-inline" key={skill.id}>
                            <NestedText
                              form={form}
                              name={`skills.${index}.items.${skillIndex}.name`}
                              label={`Skill ${skillIndex + 1} in category ${index + 1}`}
                              value={skill.name}
                              onChange={(name) =>
                                update(index, {
                                  items: group.items.map((item) =>
                                    item.id === skill.id ? { ...item, name } : item,
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              className="button small secondary"
                              aria-label={`Move skill ${skillIndex + 1} up in category ${index + 1}`}
                              disabled={!skillIndex}
                              onClick={() => {
                                const items = [...group.items];
                                [items[skillIndex - 1], items[skillIndex]] = [
                                  items[skillIndex],
                                  items[skillIndex - 1],
                                ];
                                update(index, { items });
                              }}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              className="button small secondary"
                              aria-label={`Move skill ${skillIndex + 1} down in category ${index + 1}`}
                              disabled={skillIndex === group.items.length - 1}
                              onClick={() => {
                                const items = [...group.items];
                                [items[skillIndex + 1], items[skillIndex]] = [
                                  items[skillIndex],
                                  items[skillIndex + 1],
                                ];
                                update(index, { items });
                              }}
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              className="button small secondary"
                              aria-label={`Remove skill ${skillIndex + 1} in category ${index + 1}`}
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: 'Remove skill?',
                                    message: `Remove ${skill.name || 'this skill'} from this form?`,
                                    action: 'Remove skill',
                                    destructive: true,
                                  })
                                )
                                  update(index, {
                                    items: group.items.filter((item) => item.id !== skill.id),
                                  });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="button small secondary"
                        aria-label={`Add skill to category ${index + 1}`}
                        disabled={group.items.length >= 80}
                        onClick={() =>
                          update(index, {
                            items: [...group.items, { id: crypto.randomUUID(), name: '' }],
                          })
                        }
                      >
                        Add skill
                      </button>
                    </section>
                  ))}
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={field.value.length >= 20}
                  onClick={() =>
                    field.onChange([
                      ...field.value,
                      { id: crypto.randomUUID(), category: '', items: [] },
                    ])
                  }
                >
                  Add category
                </button>
                {fieldState.error?.message ? (
                  <p role="alert" className="admin-field-error">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </>
            );
          }}
        />
      </EditorForm>
    </>
  );
}
