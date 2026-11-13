import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useContent, usePublicPath } from '../content/context';
import { PageHeading } from '../components/PageHeading';
import { Seo } from '../components/Seo';

export default function Skills() {
  const { skills } = useContent();
  const path = usePublicPath();
  return (
    <div className="container page-content skills-page">
      <Seo title="Skills" />
      <PageHeading title="Skills & tools">
        Programming, backend systems, data engineering and applied AI. The tools used across my
        projects and research.
      </PageHeading>
      <div className="skills-directory">
        {skills.map((group) => (
          <section className="skills-domain" key={group.id}>
            <h2>{group.category}</h2>
            <ul aria-label={group.category + ' skills'}>
              {group.items.map((skill) => (
                <li key={skill.id}>{skill.name}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="skills-page-close">
        <p>See these tools in the work.</p>
        <Link className="text-link" to={path('/projects')}>
          Explore projects <ArrowUpRight size={18} />
        </Link>
      </div>
    </div>
  );
}
