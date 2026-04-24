import { useEffect, useState } from 'react';
import { pathFromRoute, routeFromPath, type RoutePath } from './path-route';

// Subscribes to the browser's `popstate` event so back/forward + an
// in-app `navigateTo()` pushState both re-render the root. The
// initial value is read lazily so SSR or tests that mount the App
// before touching `window.location` pick up the current pathname. The
// event is namespaced to `popstate` — any caller that pushes a new
// history entry must dispatch `popstate` after (see `navigateTo`).
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

// Pushes the given route onto history and nudges listeners. Used by
// the landing CTA (`'play'`) and the landing footer legal links
// (`'privacy'`, `'terms'`, `'landing'` for back-to-home). Does nothing
// if the browser is already on the target path so a double-click does
// not stack duplicate history entries.
export function navigateTo(route: RoutePath): void {
  if (typeof window === 'undefined') return;
  if (routeFromPath(window.location.pathname) === route) return;
  window.history.pushState({}, '', pathFromRoute(route));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateToPlay(): void {
  navigateTo('play');
}
