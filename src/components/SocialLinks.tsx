import { useContent } from '../content/context';
import type { SocialPlatform } from '../content/schema';
import { SocialIcon } from './SocialIcon';

const names: Record<SocialPlatform, string> = { github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram', x: 'X' };

export function SocialLinks({ className = '' }: { className?: string }) {
  const { socialLinks } = useContent();
  const links = socialLinks.filter((link) => link.enabled).sort((a, b) => a.order - b.order);
  if (!links.length) return null;
  return (
    <div className={`social-links ${className}`}>
      {links.map((link) => (
        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
          <SocialIcon platform={link.platform} />{names[link.platform]}
        </a>
      ))}
    </div>
  );
}
