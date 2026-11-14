import { useEffect, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
export type Theme = 'dark' | 'light';
const key = 'rahul-portfolio:theme:v1';
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, theme);
    } catch {}
    document.documentElement.dataset.theme = theme;
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#171918' : '#f2f1eb');
  }, [theme]);
  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))] as const;
}
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const reduced = useReducedMotion();
  return (
    <m.button
      className="theme-toggle"
      type="button"
      aria-label={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'}
      aria-pressed={theme === 'light'}
      title={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'}
      onClick={onToggle}
      whileTap={reduced ? undefined : { scale: 0.9 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={theme}
          initial={reduced ? false : { opacity: 0, rotate: -65, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, rotate: 65, scale: 0.7 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
        </m.span>
      </AnimatePresence>
    </m.button>
  );
}
