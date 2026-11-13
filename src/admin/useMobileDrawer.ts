import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export function useMobileDrawer(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const sidebar = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const changed = () => {
      setMobile(query.matches);
      if (!query.matches) setOpen(false);
    };
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, [setOpen]);
  useLayoutEffect(() => {
    if (!open || !mobile || !sidebar.current) return;
    const openedAt = window.location.pathname;
    const active = document.activeElement as HTMLElement | null;
    const close = sidebar.current.querySelector<HTMLButtonElement>('.admin-menu-close');
    close?.focus({ preventScroll: true });
    const modalIsAbove = () => !!document.querySelector('dialog[open]');
    const onKeyDown = (event: KeyboardEvent) => {
      if (modalIsAbove()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = [
        ...(sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? []),
      ].filter(
        (element) =>
          element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden',
      );
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const inside = sidebar.current?.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (
        !modalIsAbove() &&
        event.target instanceof Node &&
        !sidebar.current?.contains(event.target)
      )
        close?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocus, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocus, true);
      document.body.style.overflow = overflow;
      // Route changes focus their new main content instead of the old trigger.
      if (window.location.pathname === openedAt)
        (trigger.current ?? active)?.focus({ preventScroll: true });
    };
  }, [open, mobile, setOpen]);
  return { sidebar, trigger, mobile };
}
