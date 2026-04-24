import { describe, it, expect } from 'vitest';
import { pathFromRoute, routeFromPath } from './path-route';

describe('routeFromPath', () => {
  it('treats the root path as landing', () => {
    expect(routeFromPath('/')).toBe('landing');
  });

  it('treats /play as the game route', () => {
    expect(routeFromPath('/play')).toBe('play');
  });

  it('treats /play/ (trailing slash) as the game route', () => {
    expect(routeFromPath('/play/')).toBe('play');
  });

  it('treats nested /play/... paths as the game route', () => {
    expect(routeFromPath('/play/session/abc')).toBe('play');
  });

  it('treats /privacy as the privacy page route', () => {
    expect(routeFromPath('/privacy')).toBe('privacy');
    expect(routeFromPath('/privacy/')).toBe('privacy');
  });

  it('treats /terms as the terms page route', () => {
    expect(routeFromPath('/terms')).toBe('terms');
    expect(routeFromPath('/terms/')).toBe('terms');
  });

  it('does not confuse /privacy-notice or /terms-of-use with legal routes', () => {
    expect(routeFromPath('/privacy-notice')).toBe('landing');
    expect(routeFromPath('/terms-of-use')).toBe('landing');
  });

  it('falls back to landing for unknown paths', () => {
    expect(routeFromPath('/about')).toBe('landing');
    expect(routeFromPath('/shop/badges')).toBe('landing');
  });

  it('does not confuse /playful with /play', () => {
    expect(routeFromPath('/playful')).toBe('landing');
  });
});

describe('pathFromRoute', () => {
  it('round-trips every route literal', () => {
    expect(routeFromPath(pathFromRoute('landing'))).toBe('landing');
    expect(routeFromPath(pathFromRoute('play'))).toBe('play');
    expect(routeFromPath(pathFromRoute('privacy'))).toBe('privacy');
    expect(routeFromPath(pathFromRoute('terms'))).toBe('terms');
  });
});
