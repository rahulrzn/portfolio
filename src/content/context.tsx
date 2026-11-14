import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { defaults } from './defaults';
import { getRepository } from './repository';
import type { Content } from './schema';
const ContentContext = createContext<{ content: Content; base: string }>({
  content: defaults,
  base: '',
});
export function useContent() {
  return useContext(ContentContext).content;
}
export function useIsPreview() {
  return useContext(ContentContext).base.startsWith('/admin/preview');
}
export function usePublicPath() {
  const { base } = useContext(ContentContext);
  return (path: string) => `${base}${path}` || '/';
}
export function useWorkspace() {
  const repository = getRepository();
  const snapshot = useSyncExternalStore(repository.subscribe, repository.read, repository.read);
  return { repository, snapshot };
}
export function ContentProvider({
  children,
  draft = false,
  base = '',
}: {
  children: ReactNode;
  draft?: boolean;
  base?: string;
}) {
  const { snapshot, repository } = useWorkspace();
  useEffect(() => {
    if (draft) return;
    if (repository.read().mode === 'admin') repository.leaveAdmin();
    void repository.loadPublic();
    const revalidate = () => {
      if (document.visibilityState === 'visible') void repository.loadPublic();
    };
    const interval = window.setInterval(revalidate, 30000);
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [draft, repository]);
  if (!draft && snapshot.loading) return <div className="page-loading" role="status">Loading portfolio…</div>;
  if (!draft && snapshot.connected === false) return (
    <main className="content-unavailable">
      <h1>Portfolio temporarily unavailable</h1>
      <p>Content could not be loaded. Please try again in a moment.</p>
      <button className="button secondary" type="button" onClick={() => { void repository.loadPublic(); }}>Try again</button>
    </main>
  );
  return (
    <ContentContext value={{ content: draft ? snapshot.draft : snapshot.published, base }}>
      {children}
    </ContentContext>
  );
}
