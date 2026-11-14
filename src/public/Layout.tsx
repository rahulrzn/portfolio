import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { ArrowUpRight, MapPin, Menu, X } from 'lucide-react';
import { useContent, usePublicPath } from '../content/context';
import { ProfileLinks } from '../components/ProfileLinks';
import { ResumeButton } from '../components/ResumeButton';
import { ThemeToggle, useTheme } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
export default function Layout() {
  const [theme, toggleTheme] = useTheme();
  const content = useContent();
  const path = usePublicPath();
  const homePath = path('/');
  const location = useLocation();
  const home = location.pathname === homePath || location.pathname + '/' === homePath;
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => {
    setOpen(false);
    const target = location.hash;
    if (target) {
      let cancelled = false;
      const scroll = () => {
        const element = document.getElementById(target.slice(1));
        if (!element) return;
        observer.disconnect();
        void document.fonts.ready.then(() => {
          if (!cancelled) element.scrollIntoView();
        });
      };
      const observer = new MutationObserver(scroll);
      observer.observe(document.getElementById('main') || document.body, {
        childList: true,
        subtree: true,
      });
      scroll();
      return () => {
        cancelled = true;
        observer.disconnect();
      };
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  useEffect(() => {
    setSection('');
    if (!home) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold =
        (document.querySelector('.site-header')?.getBoundingClientRect().bottom || 104) + 90;
      const current = ['work', 'about', 'skills', 'research', 'opportunities', 'contact'].find(
        (id) => {
          const rect = document.getElementById(id)?.getBoundingClientRect();
          return rect && rect.top <= threshold && rect.bottom > threshold;
        },
      );
      setSection(current || '');
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Lazy route content and restored images can arrive after this effect.
    const observer = new MutationObserver(schedule);
    const main = document.getElementById('main');
    if (main) observer.observe(main, { childList: true, subtree: true });
    const resize = new ResizeObserver(schedule);
    if (main) resize.observe(main);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [location.pathname, home]);
  const links = [
    ['Home', '/'],
    ['About', '/about'],
    ['Skills', '/skills'],
    ['Projects', '/projects'],
    ['Research', '/research'],
    ['Contact', '/contact'],
  ];
  const visiblePage =
    section === 'work' ? 'projects' : section === 'opportunities' ? 'contact' : section;
  const activeUrl = home
    ? visiblePage
      ? '/' + visiblePage
      : '/'
    : '/' + location.pathname.slice(homePath.length).split('/')[0];
  const nav = (mobile = false) => (
    <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
      {links.map(([label, url]) => (
        <Link
          className={activeUrl === url ? 'active' : ''}
          aria-current={activeUrl === url ? (home && section ? 'location' : 'page') : undefined}
          key={label}
          to={path(url)}
        >
          {label}
          {activeUrl === url ? (
            <m.span
              className="nav-marker"
              layoutId={mobile ? 'mobile-current-page' : 'current-page'}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            />
          ) : null}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="public-site" data-theme={theme}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" to={path('/')} aria-label={`${content.profile.name} home`}>
            <BrandMark />
            <span className="wordmark-name">{content.profile.name}</span>
          </Link>
          <div className="desktop-nav">
            {nav()}
            <ResumeButton small />
          </div>
          <div className="header-controls">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              ref={menuButton}
              className="menu-toggle"
              type="button"
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open ? (
            <m.div
              className="mobile-navigation"
              id="mobile-navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {nav(true)}
              <ResumeButton />
            </m.div>
          ) : null}
        </AnimatePresence>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer container">
        <div className="footer-top">
          <Link className="footer-name" to={path('/')}>
            {content.profile.name}
          </Link>
          <p>{content.settings.footerNote}</p>
          <Link className="text-link" to={path('/contact')}>
            Start a conversation <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {content.profile.name}
          </span>
          <div className="footer-links">
            <Link to={path('/projects')}>Projects</Link>
            <Link to={path('/research')}>Research</Link>
            <ProfileLinks showContactValues />
          </div>
          <span className="location">
            <MapPin size={13} />
            {content.profile.location}
          </span>
        </div>
      </footer>
    </div>
  );
}
