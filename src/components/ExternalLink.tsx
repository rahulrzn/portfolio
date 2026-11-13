import type { ReactNode } from 'react';
import { webUrl } from '../content/schema';
export function ExternalLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return href && webUrl.safeParse(href).success ? (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : null;
}
