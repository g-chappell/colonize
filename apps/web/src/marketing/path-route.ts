// Marketing landing vs. game app: a single URL-level split that sits
// above the zustand `screen` slice. `/` and `/index.html` render the
// marketing landing; anything under `/play` (bare, trailing-slash, or
// deep-linked) drops the player into the existing game app shell and
// the zustand `screen` slice owns navigation from there. Every other
// path falls back to landing — the Vite dev server + static deploy
// both serve the SPA from `/` so unknown paths reaching React are
// always a user or search-engine eye-balling the marketing home.
//
// Kept as a pure sibling so the routing decision is tested without
// mounting React; App.tsx + `usePathRoute` are the only consumers.

export type RoutePath = 'landing' | 'play';

export function routeFromPath(pathname: string): RoutePath {
  const normalised = pathname.replace(/\/+$/, '') || '/';
  if (normalised === '/play' || normalised.startsWith('/play/')) return 'play';
  return 'landing';
}
