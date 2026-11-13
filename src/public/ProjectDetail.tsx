import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useContent, usePublicPath, useIsPreview } from '../content/context';
import { ExternalLink } from '../components/ExternalLink';
import { ContentImage } from '../components/ContentImage';
import { Seo } from '../components/Seo';
import NotFound from './NotFound';
export default function ProjectDetail() {
  const preview = useIsPreview();
  const { slug } = useParams();
  const { projects } = useContent();
  const path = usePublicPath();
  const project = projects.find((p) => p.slug === slug && (p.status === 'published' || preview));
  if (!project) return <NotFound />;
  return (
    <article className="container page-content project-detail">
      <Seo title={project.title} description={project.description} />
      <Link className="text-link back-link" to={path('/projects')}>
        <ArrowLeft size={15} /> All projects
      </Link>
      <header className="detail-heading">
        <div>
          <h1>
            {project.title}
            <span className="accent" aria-hidden="true">
              .
            </span>
          </h1>
          <p>{project.subtitle || project.description}</p>
        </div>
        <div className="detail-meta">
          <span>{project.category}</span>
          <span>{project.year || project.context}</span>
        </div>
      </header>
      <div className="detail-actions">
        <ExternalLink className="button" href={project.liveUrl}>
          Live Demo <ArrowUpRight size={17} />
        </ExternalLink>
        <ExternalLink className="button secondary" href={project.githubUrl}>
          GitHub <ArrowUpRight size={17} />
        </ExternalLink>
        <ExternalLink className="button secondary" href={project.caseStudyUrl}>
          External case study <ArrowUpRight size={17} />
        </ExternalLink>
      </div>
      {project.image ? (
        <div className="detail-visual">
          <ContentImage
            reference={project.image}
            alt={`${project.title} project image`}
            fallback={null}
          />
        </div>
      ) : null}
      <div className="detail-body">
        <aside>
          <h2>Built with</h2>
          <ul>
            {project.technologies.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </aside>
        <div className="detail-story">
          {[
            ['Overview', project.overview || project.description],
            ['The problem', project.problem],
            ['The approach', project.approach],
            ['Technical implementation', project.implementation],
          ]
            .filter(([, text]) => text)
            .map(([title, text]) => (
              <section key={title}>
                <h2>{title}</h2>
                {text.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
          {project.outcomes.length ? (
            <section>
              <h2>Reported outcomes</h2>
              <p className="muted">
                Evaluation results and implementation details from the supplied résumé.
              </p>
              <div className="outcome-list">
                {project.outcomes.map((o, i) => (
                  <div key={i}>
                    <strong>{o.value}</strong>
                    <h3>{o.label}</h3>
                    <p>{o.context}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <Link className="text-link" to={path('/projects')}>
        Explore more projects <ArrowUpRight size={17} />
      </Link>
    </article>
  );
}
