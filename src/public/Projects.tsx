import { useState } from 'react';
import { Search } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { useContent, useIsPreview } from '../content/context';
import { ProjectCard } from '../components/ProjectCard';
import { Seo } from '../components/Seo';
import { PageHeading } from '../components/PageHeading';
export default function Projects() {
  const preview = useIsPreview();
  const reduced = useReducedMotion();
  const { projects } = useContent();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const published = projects
    .filter((p) => p.status === 'published' || preview)
    .sort((a, b) => a.order - b.order);
  const categories = ['All', ...new Set(published.map((p) => p.category))];
  const shown = published.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      `${p.title} ${p.description} ${p.technologies.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="container page-content projects-page">
      <Seo title="Projects" />
      <PageHeading title="Selected projects">
        Software, data pipelines and AI systems. Explore the problems, implementation and reported
        outcomes behind each project.
      </PageHeading>
      <div className="project-filters">
        <div className="filter-buttons" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={17} />
          <span className="sr-only">Search projects</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a project…"
          />
        </label>
      </div>
      <p className="results-count" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'project' : 'projects'}
      </p>
      <m.div
        className="featured-list"
        key={category + ':' + query}
        initial={reduced ? false : { opacity: 0.65 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {shown.map((p) => (
          <ProjectCard project={p} key={p.id} />
        ))}
        {!shown.length ? (
          <div className="empty-state">
            <h2>No projects found</h2>
            <p>Try a different search or category.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery('');
                setCategory('All');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </m.div>
    </div>
  );
}
