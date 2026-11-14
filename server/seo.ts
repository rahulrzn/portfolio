import type { Content, Envelope } from '../src/content/schema';
import { publicContent } from './content';
import { privateHeaders, publicCache } from './http';

export const publicPageRoutes = ['/', '/about', '/skills', '/projects', '/research', '/contact', '/resume'] as const;

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  image: string;
  robots: string;
  notFound: boolean;
  structuredData?: Record<string, unknown>;
}

export function escapeMarkup(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function siteOrigin(request: Request, content: Content): string {
  if (content.settings.siteUrl) return new URL(content.settings.siteUrl).origin;
  return new URL(request.url).origin;
}

function imageUrl(reference: string, origin: string): string {
  return new URL(reference.startsWith('image:') ? `/api/media/${reference.slice(6)}` : reference, origin).href;
}

export function metadataFor(request: Request, source: Content): PageMetadata {
  const content = publicContent(source);
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const origin = siteOrigin(request, content);
  const slug = /^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path)?.[1];
  const project = slug ? content.projects.find((project) => project.slug === slug) : undefined;
  const isPublicPage = (publicPageRoutes as readonly string[]).includes(path);
  const notFound = !isPublicPage && !project;
  const pageTitles: Record<string, string> = { '/about': 'About', '/skills': 'Skills', '/projects': 'Projects', '/research': 'Research', '/contact': 'Contact', '/resume': 'Résumé' };
  const title = notFound ? `Project unavailable | ${content.profile.name}`
    : project ? `${project.title} | ${content.profile.name}`
    : path === '/' ? content.settings.seoTitle : `${pageTitles[path]} | ${content.profile.name}`;
  const description = project?.description || (path === '/about' ? content.profile.introduction : '') || content.settings.seoDescription;
  const selectedImage = project?.image || (content.profile.image !== '/assets/rahul-portrait.webp' ? content.profile.image : '') || '/assets/social-preview.png';
  const canonical = notFound ? '' : new URL(path, origin).href;
  const structuredData = path === '/' ? {
    '@context': 'https://schema.org', '@type': 'Person', name: content.profile.name, url: origin,
    ...(content.profile.image ? { image: imageUrl(content.profile.image, origin) } : {}),
    sameAs: content.socialLinks.map((link) => link.url),
  } : project ? {
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: project.title, description: project.description,
    url: canonical, author: { '@type': 'Person', name: content.profile.name },
    ...(project.image ? { image: imageUrl(project.image, origin) } : {}),
  } : undefined;
  return {
    title, description, canonical, image: imageUrl(selectedImage, origin),
    robots: notFound ? 'noindex, nofollow' : 'index, follow', notFound, structuredData,
  };
}

export function sitemapResponse(request: Request, envelope: Envelope): Response {
  const content = publicContent(envelope.published), origin = siteOrigin(request, content);
  const tag = `"sitemap-${envelope.revision}"`;
  const headers = { ...privateHeaders, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': publicCache, ETag: tag };
  if ((request.headers.get('If-None-Match') ?? '').split(',').some((value) => value.trim() === '*' || value.trim().replace(/^W\//, '') === tag)) {
    return new Response(null, { status: 304, headers });
  }
  const paths = [...publicPageRoutes, ...content.projects.map((project) => `/projects/${project.slug}`)];
  const lastmod = Number.isFinite(Date.parse(envelope.updatedAt)) ? `<lastmod>${escapeMarkup(new Date(envelope.updatedAt).toISOString())}</lastmod>` : '';
  const urls = paths.map((path) => `  <url><loc>${escapeMarkup(new URL(path, origin).href)}</loc>${lastmod}</url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(request.method === 'HEAD' ? null : xml, { headers });
}
