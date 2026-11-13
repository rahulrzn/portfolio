import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
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
  const { snapshot } = useWorkspace();
  return (
    <ContentContext value={{ content: draft ? snapshot.draft : snapshot.published, base }}>
      {children}
    </ContentContext>
  );
}
