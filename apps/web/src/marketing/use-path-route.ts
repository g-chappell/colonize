import { useEffect, useState } from 'react';
import { routeFromPath, type RoutePath } from './path-route';

// Subscribes to the browser's `popstate` event so back/forward + an
// in-app `navigateToPlay()` pushState both re-render the root. The
// initial value is read lazily so SSR or tests that mount the App
// before touching `window.location` pick up the current pathname. The
// event is namespaced to `popstate` — any caller that pushes a new
// history entry must dispatch `popstate` after (see `navigateToPlay`).
export function usePathRoute(): RoutePath {
  const [route, setRoute] = useState<RoutePath>(() =>
    typeof window === 'undefined' ? 'landing' : routeFromPath(window.location.pathname),
  );

  useEffect(() => {
    const handler = (): void => {
      setRoute(routeFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return route;
}

// Pushes `/play` onto history and nudges listeners. Used by the
// landing page's CTA. Does nothing if the browser is already on /play
// so a double-click does not stack duplicate history entries.
export function navigateToPlay(): void {
  if (typeof window === 'undefined') return;
  if (routeFromPath(window.location.pathname) === 'play') return;
  window.history.pushState({}, '', '/play');
  window.dispatchEvent(new PopStateEvent('popstate'));
}
