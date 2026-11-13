import { lazy, Suspense, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';
import { ContentProvider, useWorkspace } from '../content/context';
import PublicRoutes from '../public/PublicRoutes';
import { AdminTools, useAdmin } from './workspace';
import { useHistoryGuard } from './useHistoryGuard';
import { useMobileDrawer } from './useMobileDrawer';
import './admin.css';

const ProfilePage = lazy(() => import('./ProfilePage'));
const ProjectsPage = lazy(() => import('./ProjectsPage'));
const SkillsPage = lazy(() => import('./SkillsPage'));
const ResearchPage = lazy(() => import('./ResearchPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const gateSchema = z.object({
  phrase: z
    .string()
    .min(8, 'Enter a session phrase with at least 8 characters.')
    .max(200, 'Use a phrase of 200 characters or fewer.'),
});
const nav = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['profile', 'Profile', UserRound],
  ['projects', 'Projects', FolderKanban],
  ['skills', 'Skills', Tags],
  ['research', 'Research', FlaskConical],
  ['settings', 'Settings', Settings2],
] as const;

function Login({ onEnter }: { onEnter: () => void }) {
  const [show, setShow] = useState(false);
  const form = useForm({ defaultValues: { phrase: '' }, resolver: zodResolver(gateSchema) });
  return (
    <main className="admin-login">
      <Link className="admin-login-back" to="/">
        View portfolio <ArrowUpRight size={16} />
      </Link>
      <motion.section
        className="admin-login-card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="admin-login-mark">
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <h1>Local development workspace</h1>
        <p className="admin-login-lead">A place to shape your portfolio.</p>
        <div className="admin-local-note">
          <strong>This gate is not authentication.</strong>
          <p>
            Any 8-character phrase opens this browser-local editor. Your phrase is not stored. This
            workspace has no secure login or remote account.
          </p>
        </div>
        <form
          noValidate
          onSubmit={form.handleSubmit(() => {
            form.reset();
            onEnter();
          })}
        >
          <Controller
            control={form.control}
            name="phrase"
            render={({ field, fieldState }) => (
              <div className="admin-field">
                <label htmlFor="admin-session">Session phrase</label>
                <div className="admin-password">
                  <input
                    {...field}
                    id="admin-session"
                    type={show ? 'text' : 'password'}
                    autoComplete="off"
                    aria-invalid={!!fieldState.error}
                    aria-describedby={
                      fieldState.error ? 'admin-session-error' : 'admin-session-hint'
                    }
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide session phrase' : 'Show session phrase'}
                    onClick={() => setShow((value) => !value)}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <small id="admin-session-hint">Use any phrase with 8 or more characters.</small>
                {fieldState.error ? (
                  <p className="admin-field-error" role="alert" id="admin-session-error">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </div>
            )}
          />
          <button className="button admin-login-submit" type="submit">
            Open workspace
          </button>
        </form>
        <p className="admin-login-foot">
          Edits persist in this browser. Reloading closes the session. Export a backup to move
          content between devices.
        </p>
      </motion.section>
    </main>
  );
}
function Dashboard() {
  const { snapshot } = useWorkspace();
  const hasDraft = JSON.stringify(snapshot.draft) !== JSON.stringify(snapshot.published);
  return (
    <>
      <header className="admin-page-heading">
        <h1>Workspace overview</h1>
        <p>Your portfolio, from first draft to public view.</p>
      </header>
      <section className="admin-overview">
        <div>
          <h2>
            {hasDraft ? 'Your saved draft has changes.' : 'Your draft matches the public view.'}
          </h2>
          <p>
            Save individual forms, review the portfolio in preview, then publish the saved draft
            when it is ready.
          </p>
          <Link className="button secondary" to="/admin/preview">
            Preview saved draft <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="admin-counts">
          <div>
            <strong>{snapshot.draft.projects.length}</strong>
            <span>Draft projects</span>
          </div>
          <div>
            <strong>
              {snapshot.published.projects.filter((item) => item.status === 'published').length}
            </strong>
            <span>Public projects</span>
          </div>
          <div>
            <strong>{snapshot.draft.research.length}</strong>
            <span>Research entries</span>
          </div>
        </div>
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <h2>Continue editing</h2>
          <div className="admin-quick-links">
            <Link to="/admin/profile">
              Update your profile <ArrowUpRight size={17} />
            </Link>
            <Link to="/admin/projects">
              Manage project stories <ArrowUpRight size={17} />
            </Link>
            <Link to="/admin/settings">
              Export a portable backup <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
        <section className="admin-panel">
          <h2>Recent activity</h2>
          {snapshot.activity.length ? (
            <ol className="admin-activity">
              {snapshot.activity.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span>
                  <time dateTime={item.at}>
                    {new Date(item.at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Saved edits and publication actions will appear here.</p>
          )}
        </section>
      </div>
    </>
  );
}
function Shell({ onSignOut }: { onSignOut: () => void }) {
  const { snapshot, repository } = useWorkspace();
  const { dirty, guard, confirm, notify } = useAdmin();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebar, trigger, mobile } = useMobileDrawer(menu, setMenu);
  useHistoryGuard(dirty);
  useEffect(() => {
    setMenu(false);
    document.querySelector<HTMLElement>('.admin-main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const hasDraft = JSON.stringify(snapshot.draft) !== JSON.stringify(snapshot.published);
  const isPreview = location.pathname.startsWith('/admin/preview');
  const captureNavigation = (event: React.MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (
      !anchor ||
      !dirty ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      anchor.target === '_blank'
    )
      return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    event.stopPropagation();
    void guard(() => navigate(url.pathname + url.search + url.hash));
  };
  if (isPreview)
    return (
      <div onClickCapture={captureNavigation}>
        <div className="admin-preview-banner">
          <span>
            <strong>Saved draft preview</strong> · Public pages remain unchanged until Publish.
          </span>
          <Link to="/admin/dashboard">Back to workspace</Link>
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
          <span className="admin-brand-monogram">R.</span>
          <span>
            Portfolio
            <br />
            <small>Content workspace</small>
          </span>
        </Link>
        <button
          className="admin-menu-close"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={21} />
        </button>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink key={path} to={`/admin/${path}`}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <p>Local development mode</p>
          <small>No account. No remote publishing.</small>
          <button type="button" onClick={() => guard(onSignOut)}>
            <LogOut size={17} />
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
            className="admin-menu-open"
            type="button"
            aria-label="Open navigation"
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          >
            <Menu size={22} />
          </button>
          <div className="admin-draft-status">
            <span
              className={
                dirty || hasDraft ? 'admin-status-dot admin-status-pending' : 'admin-status-dot'
              }
            />
            {dirty ? 'Unsaved changes' : hasDraft ? 'Saved draft changes' : 'Draft is up to date'}
          </div>
          <div className="admin-actions">
            <Link className="button small secondary" to="/admin/preview">
              Preview saved draft
            </Link>
            <button
              type="button"
              className="button small"
              disabled={dirty || !hasDraft}
              title={dirty ? 'Save or discard form changes before publishing.' : undefined}
              onClick={async () => {
                if (
                  await confirm({
                    title: 'Publish saved draft?',
                    message:
                      'Review your saved draft in Preview first. Publish will replace the public portfolio in this browser only. It does not update your deployed website or any other visitor’s browser. Unsaved form text is never published.',
                    action: 'Publish now',
                  })
                ) {
                  try {
                    repository.publish();
                    notify(
                      'Published saved draft in this browser. Your deployed site was not changed.',
                    );
                  } catch (error) {
                    notify(error instanceof Error ? error.message : 'Publish failed.', true);
                  }
                }
              }}
            >
              Publish
            </button>
          </div>
        </header>
        <div className="admin-publication-notice">
          <ShieldAlert size={17} aria-hidden="true" />
          <p>
            <strong>Browser-local publication.</strong> Saved drafts and published changes live on
            this device. Export a backup to preserve or move them.
          </p>
        </div>
        {snapshot.warning ? (
          <p className="admin-warning" role="alert">
            {snapshot.warning} Open Settings to export the damaged data.
          </p>
        ) : null}
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Suspense fallback={<p role="status">Opening editor…</p>}>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="login" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="research" element={<ResearchPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="admin-shell-footer">
          <span>Saved draft and public content are separate.</span>
          <button
            type="button"
            className="text-link"
            disabled={!hasDraft}
            onClick={() =>
              guard(() => {
                void (async () => {
                  if (
                    await confirm({
                      title: 'Discard saved draft changes?',
                      message:
                        'Replace the entire saved draft with the currently published content. Export a backup first if you need these edits.',
                      action: 'Discard saved draft',
                      destructive: true,
                    })
                  ) {
                    try {
                      repository.revert();
                      navigate('/admin/dashboard');
                      notify('Saved draft reverted to published content.');
                    } catch (error) {
                      notify(error instanceof Error ? error.message : 'Revert failed.', true);
                    }
                  }
                })();
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
  const [session, setSession] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    document.title = 'Local portfolio workspace';
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
  return (
    <MotionConfig reducedMotion="user">
      <AdminTools>
        {session ? (
          <Shell
            onSignOut={() => {
              setSession(false);
              navigate('/admin/login', { replace: true });
            }}
          />
        ) : location.pathname === '/admin/login' ? (
          <Login
            onEnter={() => {
              setSession(true);
              navigate('/admin/dashboard', { replace: true });
            }}
          />
        ) : (
          <Navigate to="/admin/login" replace />
        )}
      </AdminTools>
    </MotionConfig>
  );
}
