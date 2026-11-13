import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '../content/context';
import { webUrl } from '../content/schema';
export function Seo({
  title,
  description,
  noindex = false,
}: {
  title?: string;
  description?: string;
  noindex?: boolean;
}) {
  const { settings, profile } = useContent();
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = title ? `${title} | ${profile.name}` : settings.seoTitle;
    function meta(key: string, value: string, property = false) {
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${property ? 'property' : 'name'}="${key}"]`,
      );
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(property ? 'property' : 'name', key);
        document.head.append(element);
      }
      element.content = value;
    }
    meta('description', description ?? settings.seoDescription);
    meta('og:title', document.title, true);
    meta('og:description', description ?? settings.seoDescription, true);
    meta('twitter:title', document.title);
    meta('twitter:description', description ?? settings.seoDescription);
    meta(
      'robots',
      noindex || pathname.startsWith('/admin') ? 'noindex, nofollow' : 'index, follow',
    );
    const site = settings.siteUrl || import.meta.env.VITE_SITE_URL || '';
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (site && webUrl.safeParse(site).success && !pathname.startsWith('/admin')) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.append(canonical);
      }
      canonical.href = new URL(pathname, site).href;
      meta('og:url', canonical.href, true);
      meta('og:image', new URL('/assets/social-preview.png', site).href, true);
    } else canonical?.remove();
  }, [title, description, settings, profile.name, pathname, noindex]);
  return null;
}
