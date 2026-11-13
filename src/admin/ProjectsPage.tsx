import { useState } from 'react';
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
  onDuplicate: (project: Project) => void;
}) {
  const { repository } = useWorkspace();
  const form = useEditor(projectSchema, project);
  const { guard } = useAdmin();
  return (
    <>
      <div className="admin-editor-heading">
        <h2>Edit project</h2>
        <button
          className="button small secondary"
          type="button"
          onClick={() =>
            guard(() =>
              onDuplicate(
                repository.read().draft.projects.find((item) => item.id === project.id) ?? project,
              ),
            )
          }
        >
          Duplicate
        </button>
      </div>
      <EditorForm
        form={form}
        onCancel={onClose}
        onSave={(value) => {
          const content = repository.read().draft;
          const existing = content.projects.some((item) => item.id === value.id);
          repository.saveDraft(
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
                { value: 'draft', label: 'Draft — hidden on public site' },
                { value: 'published', label: 'Published — visible after global Publish' },
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
  const { confirm, notify, guard } = useAdmin();
  const duplicate = (project: Project) => {
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
      repository.saveDraft(
        { ...content, projects: [...content.projects, copy] },
        `Duplicated project: ${project.title}`,
      );
      setSelected(copy);
      notify('Project duplicated into draft with a new ID and slug.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Duplicate failed.', true);
    }
  };
  const reorder = (id: string, delta: number) => {
    try {
      const content = repository.read().draft;
      const ordered = [...content.projects].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((item) => item.id === id);
      [ordered[index], ordered[index + delta]] = [ordered[index + delta], ordered[index]];
      repository.saveDraft(
        { ...content, projects: ordered.map((item, i) => ({ ...item, order: i })) },
        'Reordered projects',
      );
      notify('Project order saved in draft.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Reordering failed.', true);
    }
  };
  const projects = [...snapshot.draft.projects].sort((a, b) => a.order - b.order);
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
          disabled={projects.length >= 60}
          onClick={() => guard(() => setSelected(newProject()))}
        >
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
            projects.map((project, index) => (
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
                    onClick={() => setSelected(project)}
                  >
                    Edit
                  </button>
                  <button
                    className="button small secondary"
                    type="button"
                    onClick={() => duplicate(project)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="button small secondary"
                    type="button"
                    disabled={!index}
                    aria-label={`Move ${project.title} up`}
                    onClick={() => reorder(project.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    className="button small secondary"
                    type="button"
                    disabled={index === projects.length - 1}
                    aria-label={`Move ${project.title} down`}
                    onClick={() => reorder(project.id, 1)}
                  >
                    Down
                  </button>
                  <button
                    className="button small secondary"
                    type="button"
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
                          repository.saveDraft(
                            {
                              ...content,
                              projects: content.projects.filter((item) => item.id !== project.id),
                            },
                            `Deleted project: ${project.title}`,
                          );
                          notify('Project deleted from draft.');
                        } catch (error) {
                          notify(error instanceof Error ? error.message : 'Delete failed.', true);
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-panel">
              <h2>No projects yet</h2>
              <p>
                Add a project, describe the problem you solved, and preview your work before
                publishing.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
