import { Link } from 'react-router-dom';
import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, MapPin, Plus } from 'lucide-react';
import { useRef } from 'react';
import { useContent, usePublicPath, useIsPreview } from '../content/context';
import { ContentImage } from '../components/ContentImage';
import { ProfileLinks } from '../components/ProfileLinks';
import { ResumeButton } from '../components/ResumeButton';
import { ProjectCard } from '../components/ProjectCard';
import { Seo } from '../components/Seo';
import { Opportunities } from '../components/Opportunities';

export default function Home() {
  const { profile, projects, skills, research } = useContent();
  const path = usePublicPath();
  const preview = useIsPreview();
  const reduced = useReducedMotion();
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, 35]);
  const featured = projects
    .filter((p) => (p.status === 'published' || preview) && p.featured)
    .sort((a, b) => a.order - b.order);
  const publication = research.find((r) => r.status === 'published' || preview);
  return (
    <>
      <Seo />
      <section className="hero container" ref={hero}>
        <div className="hero-meta">
          <span>
            <MapPin size={14} />
            {profile.location}
          </span>
          <span>Backend engineering / Data / Applied AI</span>
        </div>
        <m.h1
          className={'hero-name ' + (profile.name.length > 25 ? 'long-name' : '')}
          initial={reduced ? false : { clipPath: 'inset(0 0 8% 0)', y: 20, opacity: 0.85 }}
          animate={{ clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {profile.name.split(' ').map((word, i, words) => (
            <m.span
              key={i}
              className={'hero-word hero-word-' + (i % 3)}
              whileHover={reduced ? undefined : { y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </m.span>
          ))}
        </m.h1>
        <ProfileLinks className="hero-links" showContactValues />
        <div className="hero-collage">
          <div className="hero-introduction">
            <p>{profile.introduction}</p>
            <div className="hero-primary-actions">
              <ResumeButton />
              <Link className="text-link hero-project-link" to={path('/projects')}>
                Explore projects <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
          <m.figure
            className="portrait-composition"
            style={{ y: reduced ? 0 : portraitY }}
            initial={reduced ? false : { rotate: -1, y: 22 }}
            animate={{ rotate: reduced ? 0 : -5, y: 0 }}
            whileHover={reduced ? undefined : { rotate: 0, scale: 1.025 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <div className="portrait-frame">
              <ContentImage
                reference={profile.image}
                priority
                alt={'Portrait of ' + profile.name}
                fallback={
                  <div className="portrait-fallback">
                    {profile.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                }
              />
            </div>
            <figcaption>{profile.name}</figcaption>
          </m.figure>
          <div className="hero-manifesto">
            <h2>{profile.headline}</h2>
            <ArrowDownRight
              className="hero-editorial-arrow"
              size={60}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="hero-utility">
          <Link className="scroll-cue" to={path('/#work')}>
            Discover the work <ArrowDownRight size={18} />
          </Link>
        </div>
      </section>
      <section id="work" className="section container work-section">
        <div className="work-heading">
          <h2>
            Selected <em>projects.</em>
          </h2>
          <div>
            <p>A selection of software, data and applied AI projects.</p>
            <Link className="text-link" to={path('/projects')}>
              View all projects <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="home-projects">
          {featured.length ? (
            featured.map((project) => <ProjectCard key={project.id} project={project} />)
          ) : (
            <p className="empty-state">Projects will appear here when they’re published.</p>
          )}
        </div>
      </section>
      <section id="about" className="about-section">
        <div className="container about-inner">
          <div className="about-heading">
            <h2>
              About <em>me.</em>
            </h2>
            <span className="about-signature">{profile.name}</span>
          </div>
          <div className="about-content">
            {profile.about
              .split('\n\n')
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            <Link className="text-link" to={path('/about')}>
              More about me <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="education-list">
            <h3>Education</h3>
            <div className="education-spread">
              {profile.education.map((e) => (
                <article key={e.id}>
                  <span className="education-period">{e.period}</span>
                  <h4>{e.school}</h4>
                  <p>{e.degree}</p>
                  <p className="education-detail">{e.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="skills" className="section container skills-section">
        <div className="skills-heading">
          <h2>
            Skills &amp; <em>tools.</em>
          </h2>
          <p>A toolkit shaped by projects and research.</p>
        </div>
        <div className="skills-collection">
          {skills.map((group, i) => (
            <details className="skill-group" key={group.id} open={i < 2}>
              <summary>
                <span>{group.category}</span>
                <Plus size={22} strokeWidth={1.5} />
              </summary>
              <ul>
                {group.items.map((skill) => (
                  <li key={skill.id}>{skill.name}</li>
                ))}
              </ul>
            </details>
          ))}
          <Link className="text-link" to={path('/skills')}>
            Explore all skills <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      {publication ? (
        <section id="research" className="research-band">
          <div className="container research-teaser">
            <div className="research-opening">
              <h2>
                Applied <em>research.</em>
              </h2>
              <p>Research into the systems behind the software.</p>
            </div>
            <div className="research-citation">
              <span className="research-year">{publication.date}</span>
              <span className="research-publication">{publication.publication}</span>
              <h3>{publication.title}</h3>
              <Link className="text-link" to={path('/research')}>
                Explore research <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      <Opportunities />
      <section id="contact" className="contact-cta" aria-labelledby="home-contact-heading">
        <div className="container">
          <div className="contact-cta-inner">
            <div>
              <p>Have an idea in mind?</p>
              <h2 id="home-contact-heading">Let’s talk.</h2>
            </div>
            <Link
              className="contact-round-link"
              to={path('/contact')}
              aria-label="Start a conversation"
            >
              <ArrowUpRight size={66} strokeWidth={1.2} />
            </Link>
          </div>
          <ProfileLinks className="contact-cta-links" showContactValues />
        </div>
      </section>
    </>
  );
}
