import { useContent } from '../content/context';
import { PageHeading } from '../components/PageHeading';
import { ProfileLinks } from '../components/ProfileLinks';
import { ResumeButton } from '../components/ResumeButton';
import { Seo } from '../components/Seo';

export default function Resume() {
  const { profile, projects, skills, research } = useContent();
  const publishedProjects = projects.filter((project) => project.status === 'published').sort((a, b) => a.order - b.order);
  const publishedResearch = research.filter((entry) => entry.status === 'published').sort((a, b) => a.order - b.order);
  return (
    <div className="container page-content resume-page">
      <Seo title="Résumé" description={profile.introduction} />
      <PageHeading title="Résumé">Review my background, education and selected work.</PageHeading>
      <div className="resume-page-actions"><ResumeButton showPreview={false} /></div>
      <article className="resume-document" aria-label="Résumé preview">
        <header className="resume-document-header">
          <h2>{profile.name}</h2>
          <p className="resume-headline">{profile.headline}</p>
          {profile.location ? <p className="resume-detail">{profile.location}</p> : null}
          <ProfileLinks className="resume-contact" showContactValues />
        </header>
        {profile.about ? (
          <section aria-labelledby="resume-profile-heading">
            <h3 id="resume-profile-heading">Profile</h3>
            {profile.about.split('\n\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>
        ) : null}
        {profile.education.length ? (
          <section aria-labelledby="resume-education-heading">
            <h3 id="resume-education-heading">Education</h3>
            {profile.education.map((entry) => (
              <div className="resume-entry" key={entry.id}>
                <div className="resume-entry-heading"><h4>{entry.school}</h4><span>{entry.period}</span></div>
                <p>{entry.degree}</p>
                {entry.detail ? <p className="resume-detail">{entry.detail}</p> : null}
              </div>
            ))}
          </section>
        ) : null}
        {publishedProjects.length ? (
          <section aria-labelledby="resume-projects-heading">
            <h3 id="resume-projects-heading">Projects</h3>
            {publishedProjects.map((project) => (
              <div className="resume-entry" key={project.id}>
                <div className="resume-entry-heading"><h4>{project.title}</h4><span>{project.year}</span></div>
                <p>{project.description}</p>
                {project.technologies.length ? <p className="resume-detail">{project.technologies.join(' · ')}</p> : null}
                {project.outcomes.length ? (
                  <ul className="resume-outcomes">
                    {project.outcomes.map((outcome, index) => (
                      <li key={index}><strong>{outcome.value} {outcome.label}</strong>{outcome.context ? ` — ${outcome.context}` : ''}</li>
                    ))}
                  </ul>
                ) : null}
                {project.githubUrl || project.liveUrl || project.caseStudyUrl ? (
                  <div className="resume-project-links">
                    {project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a> : null}
                    {project.liveUrl ? <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live demo</a> : null}
                    {project.caseStudyUrl ? <a href={project.caseStudyUrl} target="_blank" rel="noopener noreferrer">Case study</a> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
        {skills.length ? (
          <section aria-labelledby="resume-skills-heading">
            <h3 id="resume-skills-heading">Skills</h3>
            <dl className="resume-skills">
              {skills.map((group) => (
                <div key={group.id}><dt>{group.category}</dt><dd>{group.items.map((item) => item.name).join(', ')}</dd></div>
              ))}
            </dl>
          </section>
        ) : null}
        {publishedResearch.length ? (
          <section aria-labelledby="resume-research-heading">
            <h3 id="resume-research-heading">Research</h3>
            {publishedResearch.map((entry) => (
              <div className="resume-entry" key={entry.id}>
                <h4>{entry.title}</h4>
                {entry.publication || entry.date ? <p className="resume-detail">{[entry.publication, entry.date].filter(Boolean).join(' · ')}</p> : null}
                <p>{entry.description}</p>
                {entry.link ? <a className="resume-publication-link" href={entry.link} target="_blank" rel="noopener noreferrer">Publication</a> : null}
              </div>
            ))}
          </section>
        ) : null}
      </article>
    </div>
  );
}
