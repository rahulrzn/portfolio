import { useState } from 'react';
import { Search, Plus, Copy, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useWorkspace } from '../content/context';
import { newProject } from '../content/defaults';
import { projectSchema, type Project } from '../content/schema';
import {
  Checkbox,
  EditorForm,
  Field,
  ImageField,
  OutcomeList,
  StringList,
  useEditor,
} from './forms';
import { useAdmin } from './workspace';

function ProjectEditor({
  project,
  onClose,
  onDuplicate,
}: {
  project: Project;
  onClose: () => void;
  onDuplicate: (project: Project) => Promise<void>;
}) {
  const { repository } = useWorkspace();
  const form = useEditor(projectSchema, project);
  const { guard, busy } = useAdmin();
  return (
    <>
      <div className="admin-editor-heading">
        <h2>Edit project</h2>
        <button
          className="button small secondary"
          type="button"
          disabled={busy}
          onClick={() =>
            guard(() =>
              onDuplicate(
                repository.read().draft.projects.find((item) => item.id === project.id) ?? project,
              ),
            )
          }
        >
          <Copy size={16} aria-hidden="true" />
          Duplicate
        </button>
      </div>
      <EditorForm
        form={form}
        onCancel={onClose}
        onSave={async (value) => {
          const content = repository.read().draft;
          const existing = content.projects.some((item) => item.id === value.id);
          await repository.saveDraft(
            {
              ...content,
              projects: existing
                ? content.projects.map((item) => (item.id === value.id ? value : item))
                : [...content.projects, value],
            },
            `Saved project: ${value.title}`,
          );
        }}
      >
        <section className="admin-panel">
          <h2>Project identity</h2>
          <div className="admin-form-grid">
            <Field form={form} name="title" label="Title" required />
            <Field
              form={form}
              name="slug"
              label="Slug"
              required
              hint="Unique lowercase words separated by hyphens. Changing this changes the project URL."
            />
            <Field form={form} name="subtitle" label="Subtitle" wide />
            <Field
              form={form}
              name="description"
              label="Description"
              type="textarea"
              required
              wide
            />
            <Field form={form} name="category" label="Category" required />
            <Field form={form} name="year" label="Year or period" />
            <Field form={form} name="context" label="Project context" wide />
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
            <Field
              form={form}
              name="order"
              label="Display order"
              type="number"
              hint="Smaller numbers appear first."
            />
            <Checkbox form={form} name="featured" label="Featured on the home page" />
          </div>
        </section>
        <section className="admin-panel">
          <h2>Project story</h2>
          <div className="admin-form-grid">
            <Field form={form} name="overview" label="Overview" type="textarea" wide />
            <Field form={form} name="problem" label="Problem" type="textarea" wide />
            <Field form={form} name="approach" label="Approach" type="textarea" wide />
            <Field form={form} name="implementation" label="Implementation" type="textarea" wide />
          </div>
          <StringList form={form} name="technologies" label="Technology" />
          <StringList form={form} name="workflow" label="Workflow step" max={10} />
          <OutcomeList form={form} name="outcomes" />
        </section>
        <section className="admin-panel">
          <h2>Links and image</h2>
          <p>Only add links that actually belong to this project. Leave unavailable links blank.</p>
          <div className="admin-form-grid">
            <Field form={form} name="githubUrl" label="GitHub URL" type="url" />
            <Field form={form} name="liveUrl" label="Live Demo URL" type="url" />
            <Field form={form} name="caseStudyUrl" label="External case study URL" type="url" />
          </div>
          <ImageField form={form} name="image" alt="Project image preview" />
        </section>
      </EditorForm>
    </>
  );
}
export default function ProjectsPage() {
  const { repository, snapshot } = useWorkspace();
  const [selected, setSelected] = useState<Project | null>(null);
  const [query, setQuery] = useState('');
  const { confirm, notify, guard, busy, run } = useAdmin();
  const pending = busy || !!snapshot.pending;
  const duplicate = async (project: Project) => {
    try {
      const content = repository.read().draft;
      const base = project.slug.slice(0, 64).replace(/-+$/, '');
      let slug = `${base}-copy`;
      let number = 2;
      while (content.projects.some((item) => item.slug === slug)) {
        const suffix = `-copy-${number++}`;
        slug = `${base.slice(0, 80 - suffix.length).replace(/-+$/, '')}${suffix}`;
      }
      const copy: Project = {
        ...structuredClone(project),
        id: crypto.randomUUID(),
        slug,
        title: `${project.title.slice(0, 143)} (copy)`,
        status: 'draft',
        order: Math.min(10000, project.order + 1),
      };
      await run(async () => {
        await repository.saveDraft(
          { ...content, projects: [...content.projects, copy] },
          `Duplicated project: ${project.title}`,
        );
      }, 'Duplicating project…');
      setSelected(copy);
      notify('Project duplicated into draft with a new ID and slug.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Duplicate failed.', true);
    }
  };
  const reorder = async (id: string, delta: number) => {
    try {
      const content = repository.read().draft;
      const ordered = [...content.projects].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((item) => item.id === id);
      if (index < 0 || index + delta < 0 || index + delta >= ordered.length) return;
      [ordered[index], ordered[index + delta]] = [ordered[index + delta], ordered[index]];
      await run(async () => {
        await repository.saveDraft(
          { ...content, projects: ordered.map((item, i) => ({ ...item, order: i })) },
          'Reordered projects',
        );
      });
      notify('Project order saved in draft.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Reordering failed.', true);
    }
  };
  const projects = [...snapshot.draft.projects].sort((a, b) => a.order - b.order);
  const matching = projects.filter((project) =>
    `${project.title} ${project.subtitle} ${project.category} ${project.technologies.join(' ')}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Projects</h1>
          <p>Tell the story of your work and control what appears publicly.</p>
        </div>
        <button
          className="button"
          type="button"
          disabled={pending || projects.length >= 60}
          onClick={() => guard(() => setSelected(newProject()))}
        >
          <Plus size={17} aria-hidden="true" />
          Add project
        </button>
      </header>
      {selected ? (
        <ProjectEditor
          key={selected.id}
          project={selected}
          onClose={() => setSelected(null)}
          onDuplicate={duplicate}
        />
      ) : (
        <div className="admin-collection">
          {projects.length ? (
            <div className="admin-collection-tools">
              <label className="admin-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search projects"
                  placeholder="Search projects"
                  value={query}
                  disabled={pending}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <span className="admin-collection-count">
                {matching.length} of {projects.length} projects
              </span>
            </div>
          ) : null}
          {matching.length ? (
            matching.map((project) => {
              const index = projects.findIndex((item) => item.id === project.id);
              return (
                <article className="admin-project-row" key={project.id}>
                  <div className="admin-row-content">
                    <span
                      className={`admin-badge ${project.status === 'draft' ? 'admin-badge-draft' : ''}`}
                    >
                      {project.status === 'draft' ? 'Draft item' : 'Public-ready'}
                      {project.featured ? ' · Featured' : ''}
                    </span>
                    <h2>{project.title}</h2>
                    <p>{project.subtitle || project.description}</p>
                    <small>/{project.slug}</small>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="button small"
                      type="button"
                      disabled={pending}
                      onClick={() => setSelected(project)}
                    >
                      Edit
                    </button>
                    <button
                      className="button small secondary"
                      type="button"
                      disabled={pending || projects.length >= 60}
                      onClick={() => duplicate(project)}
                    >
                      <Copy size={15} aria-hidden="true" />
                      Duplicate
                    </button>
                    <button
                      className="button small secondary"
                      type="button"
                      disabled={pending || !index}
                      aria-label={`Move ${project.title} up`}
                      onClick={() => reorder(project.id, -1)}
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                      Up
                    </button>
                    <button
                      className="button small secondary"
                      type="button"
                      disabled={pending || index === projects.length - 1}
                      aria-label={`Move ${project.title} down`}
                      onClick={() => reorder(project.id, 1)}
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
                            title: 'Delete project?',
                            message: `Delete ${project.title} from the saved draft? Published content and its images stay available until you publish.`,
                            action: 'Delete project',
                            destructive: true,
                          })
                        ) {
                          try {
                            const content = repository.read().draft;
                            await run(async () => {
                              await repository.saveDraft(
                                {
                                  ...content,
                                  projects: content.projects.filter(
                                    (item) => item.id !== project.id,
                                  ),
                                },
                                `Deleted project: ${project.title}`,
                              );
                            }, 'Deleting project…');
                            notify('Project deleted from draft.');
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
              );
            })
          ) : (
            <div className="admin-panel">
              <h2>{projects.length ? 'No matching projects' : 'No projects yet'}</h2>
              <p>
                {projects.length
                  ? 'Try another title, category or technology.'
                  : 'Add a project, describe the problem you solved, and preview your work before publishing.'}
              </p>
              {projects.length ? (
                <button className="button secondary" type="button" onClick={() => setQuery('')}>
                  Clear search
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
