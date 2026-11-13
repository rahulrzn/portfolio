import { ArrowUpRight } from 'lucide-react';
import { useContent, useIsPreview } from '../content/context';
import { ExternalLink } from '../components/ExternalLink';
import { Seo } from '../components/Seo';
import { PageHeading } from '../components/PageHeading';
export default function Research() {
  const preview = useIsPreview();
  const { research } = useContent();
  const shown = research
    .filter((r) => r.status === 'published' || preview)
    .sort((a, b) => a.order - b.order);
  return (
    <div className="container page-content research-page">
      <Seo title="Research" />
      <PageHeading title="Applied research">
        Research into AI-agent security, conversation-level threat detection and the behavior of
        intelligent systems.
      </PageHeading>
      {shown.map((item) => (
        <article className="research-article" key={item.id}>
          <aside>
            <p>{item.date}</p>
            <p>{item.publication}</p>
          </aside>
          <div>
            <h2>{item.title}</h2>
            <p className="research-description">{item.description}</p>
            <ul className="technology-list">
              {item.technologies.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <h3>Technical notes</h3>
            {item.details
              .split('\n\n')
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            {item.outcomes.length ? (
              <div className="research-outcomes">
                {item.outcomes.map((o, i) => (
                  <div key={i}>
                    <strong>{o.value}</strong>
                    <h4>{o.label}</h4>
                    <p>{o.context}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <ExternalLink href={item.link} className="text-link">
              Read publication <ArrowUpRight size={17} />
            </ExternalLink>
          </div>
        </article>
      ))}
      {!shown.length ? (
        <div className="empty-state">
          <h2>Research is being prepared</h2>
          <p>Published research will appear here.</p>
        </div>
      ) : null}
    </div>
  );
}
