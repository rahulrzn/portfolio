import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { usePublicPath } from '../content/context';
import type { Project } from '../content/schema';
import { ExternalLink } from './ExternalLink';
import { ContentImage } from './ContentImage';

export function ProjectCard({ project }: { project: Project }) {
  const path = usePublicPath();
  return (
    <article className="project-card">
      <header className="project-heading">
        <h3>
          <Link to={path('/projects/' + project.slug)}>{project.title}</Link>
        </h3>
        <p className="project-subtitle">{project.subtitle}</p>
        <div className="project-meta">
          <span>{project.category}</span>
          {project.year || project.context ? <span>{project.year || project.context}</span> : null}
        </div>
      </header>
      <div className="project-summary">
        <p>{project.description}</p>
        <ul className="technology-list" aria-label={project.title + ' technologies'}>
          {project.technologies.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="project-actions">
          <Link
            className="text-link"
            to={path('/projects/' + project.slug)}
            aria-label={'Explore ' + project.title}
          >
            View case study <ArrowRight size={18} />
          </Link>
          <ExternalLink className="text-link live-link" href={project.liveUrl}>
            Live Demo <ArrowUpRight size={17} />
          </ExternalLink>
          <ExternalLink className="text-link" href={project.githubUrl}>
            GitHub <ArrowUpRight size={17} />
          </ExternalLink>
        </div>
      </div>
      {project.image ? (
        <div className="project-media">
          <Link to={path('/projects/' + project.slug)} tabIndex={-1} aria-hidden="true">
            <ContentImage
              reference={project.image}
              alt={project.title + ' project image'}
              fallback={null}
            />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
