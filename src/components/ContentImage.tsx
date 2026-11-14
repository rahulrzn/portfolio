import { useState, type ReactNode } from 'react';
import { mediaUrl } from '../content/images';
export function ContentImage({
  reference,
  alt,
  className = '',
  fallback,
  priority = false,
}: {
  reference: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
  priority?: boolean;
}) {
  const [failedReference, setFailedReference] = useState('');
  const source = reference.startsWith('image:') ? mediaUrl(reference) : reference;
  return source && failedReference !== reference ? (
    <img
      className={className}
      src={source}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailedReference(reference)}
    />
  ) : (
    <>{fallback}</>
  );
}
