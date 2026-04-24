import { describe, it, expect } from 'vitest';
import { routeFromPath } from './path-route';

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

  it('falls back to landing for unknown paths', () => {
    expect(routeFromPath('/about')).toBe('landing');
    expect(routeFromPath('/shop/badges')).toBe('landing');
  });

  it('does not confuse /playful with /play', () => {
    expect(routeFromPath('/playful')).toBe('landing');
  });
});
