// Marketing landing vs. game app: a single URL-level split that sits
// above the zustand `screen` slice. `/` and `/index.html` render the
// marketing landing; anything under `/play` (bare, trailing-slash, or
// deep-linked) drops the player into the existing game app shell and
// the zustand `screen` slice owns navigation from there. `/privacy`
// and `/terms` render the static legal pages linked from the landing
// footer. Every other path falls back to landing — the Vite dev
// server + static deploy both serve the SPA from `/` so unknown paths
// reaching React are always a user or search-engine eye-balling the
// marketing home.
//
// Kept as a pure sibling so the routing decision is tested without
// mounting React; App.tsx + `usePathRoute` are the only consumers.

export type RoutePath = 'landing' | 'play' | 'privacy' | 'terms';

export function routeFromPath(pathname: string): RoutePath {
  const normalised = pathname.replace(/\/+$/, '') || '/';
  if (normalised === '/play' || normalised.startsWith('/play/')) return 'play';
  if (normalised === '/privacy') return 'privacy';
  if (normalised === '/terms') return 'terms';
  return 'landing';
}

export function pathFromRoute(route: RoutePath): string {
  switch (route) {
    case 'landing':
      return '/';
    case 'play':
      return '/play';
    case 'privacy':
      return '/privacy';
    case 'terms':
      return '/terms';
  }
}
