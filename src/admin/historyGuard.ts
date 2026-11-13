type HistoryEntry = { dirty: boolean; url: string; state: { idx?: number } | null };
let current: HistoryEntry | null = null;
let restoring = false;

export function setHistoryGuard(entry: HistoryEntry | null) {
  current = entry;
}

function onPopState(event: PopStateEvent) {
  if (restoring) {
    restoring = false;
    return;
  }
  const entry = current;
  if (!entry?.dirty || window.confirm('Discard unsaved form changes and leave this editor?'))
    return;
  // Registered before Router by main's small eager import. Stop it before form unmount.
  event.stopImmediatePropagation();
  const currentIndex = entry.state?.idx;
  const targetIndex = event.state?.idx;
  if (
    typeof currentIndex === 'number' &&
    typeof targetIndex === 'number' &&
    currentIndex !== targetIndex
  ) {
    restoring = true;
    window.history.go(currentIndex - targetIndex);
  } else {
    window.history.replaceState(entry.state, '', entry.url);
  }
}

// The listener stays lightweight and inactive outside a mounted admin editor.
if (typeof window !== 'undefined') window.addEventListener('popstate', onPopState);
