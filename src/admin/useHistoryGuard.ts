import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setHistoryGuard } from './historyGuard';

/** Update the early native listener without reordering it behind React Router. */
export function useHistoryGuard(dirty: boolean) {
  const location = useLocation();
  useLayoutEffect(() => {
    setHistoryGuard({
      dirty,
      state: window.history.state,
      url: location.pathname + location.search + location.hash,
    });
    return () => setHistoryGuard(null);
  }, [dirty, location.pathname, location.search, location.hash]);
}
