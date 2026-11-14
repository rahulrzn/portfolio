import { afterEach, expect, it, vi } from 'vitest';
import { setHistoryGuard } from './historyGuard';

afterEach(() => {
  setHistoryGuard(null);
  vi.restoreAllMocks();
});

it('blocks browser history navigation while a server save is pending', () => {
  const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true);
  setHistoryGuard({ dirty: false, pending: true, url: '/admin/profile', state: { idx: 1 } });
  window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 0 } }));
  expect(go).toHaveBeenCalledWith(1);
  expect(confirmation).not.toHaveBeenCalled();
  // Complete the synthetic restoration before the next test reuses this listener.
  window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 1 } }));
});
