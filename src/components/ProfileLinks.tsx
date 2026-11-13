import { CodeXml, BriefcaseBusiness, Mail, Phone } from 'lucide-react';
import { useContent } from '../content/context';
import { phoneHref } from '../content/contact';
import { ExternalLink } from './ExternalLink';

export function ProfileLinks({
  className = '',
  showContactValues = false,
}: {
  className?: string;
  showContactValues?: boolean;
}) {
  const { profile } = useContent();
  const telephone = phoneHref(profile.phone);
  return (
    <div className={'profile-links ' + className}>
      <ExternalLink href={profile.githubUrl}>
        <CodeXml size={18} aria-hidden="true" />
        GitHub
      </ExternalLink>
      <ExternalLink href={profile.linkedinUrl}>
        <BriefcaseBusiness size={18} aria-hidden="true" />
        LinkedIn
      </ExternalLink>
      {profile.email ? (
        <a href={'mailto:' + profile.email}>
          <Mail size={18} aria-hidden="true" />
          {showContactValues ? profile.email : 'Email'}
        </a>
      ) : null}
      {telephone ? (
        <a href={telephone}>
          <Phone size={18} aria-hidden="true" />
          {showContactValues ? profile.phone : 'Phone'}
        </a>
      ) : null}
    </div>
  );
}
