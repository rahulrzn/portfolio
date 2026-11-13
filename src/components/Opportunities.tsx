import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { useContent, usePublicPath } from '../content/context';

export function Opportunities() {
  const { opportunities } = useContent().profile;
  const path = usePublicPath();
  const reduced = useReducedMotion();
  if (!opportunities.visible) return null;
  return (
    <section
      id="opportunities"
      className="opportunities-section"
      aria-labelledby="opportunities-title"
    >
      <div className="container opportunities-inner">
        <div className="opportunities-introduction">
          <m.h2
            id="opportunities-title"
            initial={reduced ? false : { opacity: 0.75, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {opportunities.heading}
          </m.h2>
          <p className="availability-indicator">
            <span aria-hidden="true" />
            Open to work
          </p>
          <p className="opportunities-summary">{opportunities.summary}</p>
          <p className="opportunities-flexibility">{opportunities.flexibility}</p>
          <Link className="button opportunity-contact" to={path('/contact')}>
            Discuss an opportunity <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="opportunities-details">
          <div className="career-interests">
            <h3>Career interests</h3>
            <ul>
              {opportunities.careerInterests.map((role, index) => (
                <li key={index}>{role}</li>
              ))}
            </ul>
          </div>
          <div className="opportunities-location-row">
            <div>
              <h3>Preferred locations</h3>
              <p>In priority order</p>
              <ol>
                {opportunities.preferredLocations.map((location, index) => (
                  <li key={index}>{location}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3>Ways to work</h3>
              <ul>
                {opportunities.employmentTypes.map((type, index) => (
                  <li key={index}>{type}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
