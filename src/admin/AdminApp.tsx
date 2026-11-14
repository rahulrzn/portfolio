import { lazy, Suspense, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  LayoutDashboard,
  FolderKanban,
  UserRound,
  Tags,
  FlaskConical,
  Settings2,
  Menu,
  X,
  LogOut,
  Eye,
  BookOpen,
  Link2,
  Mail,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  AlertCircle,
  Globe2,
  Laptop,
} from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { ContentProvider, useWorkspace } from '../content/context';
import { getRepository } from '../content/repository';
import { sessionApi } from '../content/api';
import PublicRoutes from '../public/PublicRoutes';
import { useTheme, type Theme } from '../components/ThemeToggle';
import { AdminTools, useAdmin } from './workspace';
import { useHistoryGuard } from './useHistoryGuard';
import { useMobileDrawer } from './useMobileDrawer';
import Login, { StudioMark, ThemeControl } from './Login';
import Dashboard from './Dashboard';
import SessionRenewal from './SessionRenewal';
import './admin.css';

const ProfilePage = lazy(() => import('./ProfilePage'));
const AboutPage = lazy(() => import('./AboutPage'));
const ProjectsPage = lazy(() => import('./ProjectsPage'));
const SkillsPage = lazy(() => import('./SkillsPage'));
const ResearchPage = lazy(() => import('./ResearchPage'));
const SocialLinksPage = lazy(() => import('./SocialLinksPage'));
const ContactPage = lazy(() => import('./ContactPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

type Session = Awaited<ReturnType<typeof sessionApi.read>>;
const navigation = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['profile', 'Profile', UserRound],
  ['about', 'About', BookOpen],
  ['projects', 'Projects', FolderKanban],
  ['skills', 'Skills', Tags],
  ['research', 'Research', FlaskConical],
  ['social', 'Social links', Link2],
  ['contact', 'Contact', Mail],
  ['settings', 'Settings', Settings2],
] as const;

function Shell({
  session,
  onSignOut,
  onSignIn,
  theme,
  onToggleTheme,
}: {
  session: Session;
  onSignOut: () => Promise<void>;
  onSignIn: (password: string) => Promise<void>;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const { snapshot, repository } = useWorkspace();
  const {
    dirty,
    busy,
    operation,
    authenticationRequired,
    clearAuthenticationRequirement,
    guard,
    confirm,
    notify,
    run,
    setDirty,
  } = useAdmin();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebar, trigger, mobile } = useMobileDrawer(menu, setMenu);
  const pending = busy || !!snapshot.pending;
  useHistoryGuard(dirty, pending);
  useEffect(() => {
    setMenu(false);
    document.querySelector<HTMLElement>('.admin-main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const hasDraft = JSON.stringify(snapshot.draft) !== JSON.stringify(snapshot.published);
  const isPreview = location.pathname.startsWith('/admin/preview');
  const current = navigation.find(([path]) => location.pathname.startsWith('/admin/' + path));
  const local = session.environment === 'local';
  const captureNavigation = (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (
      !anchor ||
      (!dirty && !pending) ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target === '_blank'
    )
      return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    event.stopPropagation();
    void guard(() => navigate(url.pathname + url.search + url.hash));
  };
  const publish = async () => {
    if (dirty || pending || !hasDraft) return;
    if (
      !(await confirm({
        title: 'Publish saved draft?',
        message: local
          ? 'This makes the complete saved draft public in your local development database. Your live portfolio is unchanged. Review Preview before continuing.'
          : 'This makes the complete saved draft public on your live portfolio. Visitors will see this version. Review Preview before continuing.',
        action: 'Publish now',
      }))
    )
      return;
    try {
      await run(async () => {
        await repository.publish();
      }, 'Publishing saved draft…');
      notify(
        local
          ? 'Saved draft published to your local workspace.'
          : 'Saved draft published. Your public portfolio is updated.',
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Publish failed. Try again.', true);
    }
  };
  if (isPreview)
    return (
      <div className="admin-preview" onClickCapture={captureNavigation}>
        <div className="admin-preview-banner">
          <span>
            <strong>Saved draft preview</strong>
            <span>Only saved changes are shown. Publish makes them public.</span>
          </span>
          <Link className="button small secondary" to="/admin/dashboard">
            Back to workspace
          </Link>
        </div>
        <Routes>
          <Route
            path="preview/*"
            element={
              <ContentProvider draft base="/admin/preview">
                <PublicRoutes />
              </ContentProvider>
            }
          />
        </Routes>
      </div>
    );
  return (
    <div className="admin-shell" onClickCapture={captureNavigation}>
      <a inert={menu && mobile} className="admin-skip" href="#admin-main">
        Skip to editor
      </a>
      <aside
        ref={sidebar}
        id="admin-navigation"
        role={menu && mobile ? 'dialog' : undefined}
        aria-modal={menu && mobile ? true : undefined}
        className={`admin-sidebar ${menu ? 'admin-sidebar-open' : ''}`}
        aria-label="Workspace navigation"
      >
        <Link className="admin-brand" to="/admin/dashboard">
          <StudioMark />
          <span>
            Portfolio studio<small>Rahul Reji R.</small>
          </span>
        </Link>
        <button
          className="admin-menu-close admin-icon-button"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={21} aria-hidden="true" />
        </button>
        <nav aria-label="Workspace sections">
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={`/admin/${path}`} aria-disabled={pending || undefined}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {path === 'projects' ? (
                <small>{snapshot.draft.projects.length}</small>
              ) : path === 'research' ? (
                <small>{snapshot.draft.research.length}</small>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-environment">
            {local ? (
              <Laptop size={17} aria-hidden="true" />
            ) : (
              <Globe2 size={17} aria-hidden="true" />
            )}
            <strong>{local ? 'Local workspace' : 'Live portfolio'}</strong>
          </div>
          <p>
            {local ? 'Edits stay in your local database.' : 'Publishing updates your public site.'}
          </p>
          <Link className="admin-view-site" to="/" target="_blank" rel="noopener">
            View portfolio <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void guard(async () => {
                try {
                  await run(onSignOut, 'Signing out…');
                  clearAuthenticationRequirement();
                  setDirty(false);
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Sign-out failed. Try again.',
                    true,
                  );
                }
              })
            }
          >
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
      {menu ? (
        <button
          className="admin-menu-scrim"
          type="button"
          tabIndex={-1}
          aria-label="Close navigation overlay"
          onClick={() => setMenu(false)}
        />
      ) : null}
      <div className="admin-body" inert={menu && mobile}>
        <header className="admin-topbar">
          <button
            ref={trigger}
            aria-controls="admin-navigation"
            className="admin-menu-open admin-icon-button"
            type="button"
            aria-label="Open navigation"
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="admin-toolbar-context">
            <span>Workspace</span>
            <strong>{current?.[1] ?? 'Overview'}</strong>
          </div>
          <div className="admin-draft-status" role="status">
            {pending ? (
              <LoaderCircle className="admin-spinner" size={16} aria-hidden="true" />
            ) : dirty ? (
              <Clock3 size={16} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={16} aria-hidden="true" />
            )}
            <span>
              {pending
                ? operation || 'Saving changes…'
                : dirty
                  ? 'Unsaved changes'
                  : hasDraft
                    ? 'Draft saved'
                    : 'All changes published'}
            </span>
          </div>
          <div className="admin-actions">
            <ThemeControl theme={theme} onToggle={onToggleTheme} />
            <Link
              className="button small secondary admin-preview-action"
              to="/admin/preview"
              aria-label="Preview saved draft"
              aria-disabled={pending || undefined}
            >
              <Eye size={16} aria-hidden="true" />
              <span>Preview</span>
            </Link>
            <button
              type="button"
              className="button small"
              disabled={dirty || pending || !hasDraft}
              title={
                dirty
                  ? 'Save or discard your form changes before publishing.'
                  : !hasDraft
                    ? 'Your saved draft is already published.'
                    : undefined
              }
              onClick={() => void publish()}
            >
              Publish
            </button>
          </div>
        </header>
        {authenticationRequired ? <SessionRenewal onSignIn={onSignIn} /> : null}
        {snapshot.warning ? (
          <div className="admin-warning" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{snapshot.warning}</span>
          </div>
        ) : null}
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Suspense
            fallback={
              <p className="admin-opening" role="status">
                <LoaderCircle className="admin-spinner" size={18} aria-hidden="true" />
                Opening editor…
              </p>
            }
          >
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="login" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="research" element={<ResearchPage />} />
              <Route path="social" element={<SocialLinksPage />} />
              <Route path="social-links" element={<Navigate to="/admin/social" replace />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="admin-shell-footer">
          <span>
            {local ? 'Local database' : 'Live portfolio'} · Saved drafts stay private until
            published.
          </span>
          <button
            type="button"
            className="text-link"
            disabled={!hasDraft || pending}
            onClick={() =>
              void guard(async () => {
                if (
                  !(await confirm({
                    title: 'Discard saved draft changes?',
                    message:
                      'Replace the complete saved draft with the currently published portfolio. Export a backup in Settings first if you need to keep these edits.',
                    action: 'Discard saved draft',
                    destructive: true,
                  }))
                )
                  return;
                try {
                  await run(async () => {
                    await repository.revert();
                  });
                  navigate('/admin/dashboard');
                  notify('Saved draft restored to the published portfolio.');
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : 'Could not discard the saved draft. Try again.',
                    true,
                  );
                }
              })
            }
          >
            Discard saved draft
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [theme, toggleTheme] = useTheme();
  const [phase, setPhase] = useState<'checking' | 'login' | 'loading' | 'ready' | 'unavailable'>(
    'checking',
  );
  const [session, setSession] = useState<Session | null>(null);
  const [failure, setFailure] = useState('');
  const repository = getRepository();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const location = useLocation();
  const path = useRef(location.pathname);
  path.current = location.pathname;
  const returnTo = useRef(
    location.pathname === '/admin/login' ? '/admin/dashboard' : location.pathname,
  );
  const generation = useRef(0);
  const checkSession = useCallback(async () => {
    const request = ++generation.current;
    setPhase('checking');
    setFailure('');
    try {
      const next = await sessionApi.read();
      if (request !== generation.current) return;
      setSession(next);
      if (!next.authenticated) {
        repository.leaveAdmin();
        setPhase('login');
        navigateRef.current('/admin/login', { replace: true });
        return;
      }
      setPhase('loading');
      await repository.loadAdmin();
      if (request !== generation.current) return;
      setPhase('ready');
      if (path.current === '/admin/login') navigateRef.current(returnTo.current, { replace: true });
    } catch (error) {
      if (request !== generation.current) return;
      setFailure(
        error instanceof Error ? error.message : 'Could not open the workspace. Try again.',
      );
      setPhase('unavailable');
    }
  }, [repository]);
  useEffect(() => {
    void checkSession();
    return () => {
      generation.current += 1;
      repository.leaveAdmin();
    };
  }, [checkSession, repository]);
  useEffect(() => {
    document.title = 'Portfolio studio · Rahul Reji R.';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const owned = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.append(robots);
    }
    const previous = robots.content;
    robots.content = 'noindex, nofollow';
    return () => {
      if (owned) robots?.remove();
      else if (robots) robots.content = previous;
    };
  }, []);
  const login = async (password: string) => {
    const next = await sessionApi.login(password);
    if (!next.authenticated)
      throw new Error('Sign-in was not accepted. Check your password and try again.');
    setSession(next);
    setPhase('loading');
    try {
      await repository.loadAdmin();
      setPhase('ready');
      navigate(returnTo.current, { replace: true });
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : 'Could not load saved content. Try again.',
      );
      setPhase('unavailable');
    }
  };
  const signOut = async () => {
    await sessionApi.logout();
    repository.leaveAdmin();
    setSession(null);
    returnTo.current = '/admin/dashboard';
    setPhase('login');
    navigate('/admin/login', { replace: true });
  };
  const renewSession = async (password: string) => {
    const next = await sessionApi.login(password);
    if (!next.authenticated)
      throw new Error('Sign-in was not accepted. Check your password and try again.');
    setSession(next);
  };
  return (
    <MotionConfig reducedMotion="user">
      <AdminTools>
        {phase === 'ready' && session ? (
          <Shell
            session={session}
            onSignOut={signOut}
            onSignIn={renewSession}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        ) : phase === 'login' ? (
          <Login
            onLogin={login}
            environment={session?.environment}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        ) : (
          <main className="admin-login">
            <header className="admin-login-topline">
              <Link className="admin-login-back" to="/">
                View portfolio <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <ThemeControl theme={theme} onToggle={toggleTheme} />
            </header>
            <section className="admin-login-card admin-connection-card">
              <StudioMark />
              <h1>
                {phase === 'unavailable'
                  ? 'Workspace unavailable'
                  : phase === 'loading'
                    ? 'Opening your workspace'
                    : 'Checking your session'}
              </h1>
              {phase === 'unavailable' ? (
                <>
                  <p role="alert" className="admin-connection-error">
                    {failure}
                  </p>
                  <button type="button" className="button" onClick={() => void checkSession()}>
                    Try again
                  </button>
                </>
              ) : (
                <p role="status" className="admin-opening">
                  <LoaderCircle className="admin-spinner" size={19} aria-hidden="true" />
                  {phase === 'loading'
                    ? 'Loading your saved draft and public content…'
                    : 'Restoring your secure sign-in…'}
                </p>
              )}
            </section>
          </main>
        )}
      </AdminTools>
    </MotionConfig>
  );
}
