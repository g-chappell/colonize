import { describe, it, expect } from 'vitest';
import { CONTENT_VERSION, PROJECT_TAGLINE } from './index.js';

describe('@colonize/content', () => {
  it('exposes a version constant', () => {
    expect(CONTENT_VERSION).toBe('0.0.0');
  });

  it('exposes the project tagline', () => {
    expect(PROJECT_TAGLINE).toContain('NW 2191');
  });
});
