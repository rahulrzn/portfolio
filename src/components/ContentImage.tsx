import { useEffect, useState, type ReactNode } from 'react';
import { imageStore } from '../content/images';
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
  const [source, setSource] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let blobUrl = '';
    setFailed(false);
    if (!reference.startsWith('image:')) {
      setSource(reference);
      return;
    }
    setSource('');
    imageStore.get(reference).then((blob) => {
      if (active && blob) {
        blobUrl = URL.createObjectURL(blob);
        setSource(blobUrl);
      }
    });
    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [reference]);
  return source && !failed ? (
    <img
      className={className}
      src={source}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <>{fallback}</>
  );
}
