import type { SocialPlatform } from '../content/schema';

// Small brand marks are vector UI assets; link text supplies their accessible names.
export function SocialIcon({ platform, size = 18, className = '' }: { platform: SocialPlatform; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false">
      {platform === 'github' && <path d="M12 .7a11.3 11.3 0 0 0-3.57 22.02c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.72.4-1.22.71-1.5-2.5-.29-5.14-1.25-5.14-5.59 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.16a10.83 10.83 0 0 1 5.64 0c2.15-1.46 3.1-1.16 3.1-1.16.62 1.55.23 2.69.11 2.98a4.36 4.36 0 0 1 1.16 3.03c0 4.35-2.65 5.3-5.17 5.58.4.35.77 1.04.77 2.1v3.11c0 .3.2.65.77.54A11.3 11.3 0 0 0 12 .7Z" />}
      {platform === 'linkedin' && <path d="M20.45 20.45H16.9v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.4v1.56h.05c.48-.9 1.64-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.35 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.13 20.45H3.57V9h3.56v11.45ZM22.23 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.2 0 22.23 0Z" />}
      {platform === 'instagram' && <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.3" cy="6.8" r="1.2" />
      </>}
      {platform === 'x' && <path d="M18.9 2h3.2l-7 8L23.3 22h-6.4l-5-7.3L5.5 22H2.3l7.5-8.6L1.8 2h6.6L13 8.8 18.9 2Zm-1.1 18h1.8L7.4 3.9H5.5L17.8 20Z" />}
    </svg>
  );
}
