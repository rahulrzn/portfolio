import { m, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useContent, usePublicPath } from '../content/context';
import { ContentImage } from '../components/ContentImage';
import { PageHeading } from '../components/PageHeading';
import { ResumeButton } from '../components/ResumeButton';
import { Seo } from '../components/Seo';
import { ProfileLinks } from '../components/ProfileLinks';
import { Opportunities } from '../components/Opportunities';

export default function About() {
  const { profile } = useContent();
  const path = usePublicPath();
  const reduced = useReducedMotion();
  return (
    <>
      <div className="about-page page-content">
        <Seo title="About" description={profile.introduction} />
        <div className="container">
          <PageHeading title="About me">{profile.introduction}</PageHeading>
          <div className="about-profile">
            <m.figure
              className="about-portrait"
              whileHover={reduced ? undefined : { rotate: -2 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <ContentImage
                reference={profile.image}
                alt={'Portrait of ' + profile.name}
                priority
                fallback={
                  <div className="portrait-fallback">
                    {profile.name
                      .split(' ')
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                }
              />
              <figcaption>{profile.name}</figcaption>
            </m.figure>
            <div className="about-biography">
              <h2>Software, data and applied AI.</h2>
              {profile.about
                .split('\n\n')
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              <div className="about-page-actions">
                <ResumeButton />
                <Link className="text-link" to={path('/projects')}>
                  Explore projects <ArrowUpRight size={18} />
                </Link>
              </div>
              <ProfileLinks showContactValues />
            </div>
          </div>
          <section className="about-education">
            <h2>Education</h2>
            <div className="education-spread">
              {profile.education.map((education) => (
                <article key={education.id}>
                  <p className="education-period">{education.period}</p>
                  <h3>{education.school}</h3>
                  <p>{education.degree}</p>
                  <p>{education.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Opportunities />
    </>
  );
}
