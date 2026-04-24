import { describe, it, expect } from 'vitest';

import {
  FRONTIER_MOTIF_ALPHA,
  FRONTIER_MOTIF_COLOR_HEX,
  FRONTIER_MOTIF_DENSITY,
  FRONTIER_MOTIF_REGISTER,
  FRONTIER_MOTTO_VARIANTS,
  pickFrontierMotto,
} from './frontier-motifs.js';
import { PALETTE_BY_REGISTER } from './palette.js';

describe('FRONTIER_MOTTO_VARIANTS', () => {
  it('has at least one motto and none are empty', () => {
    expect(FRONTIER_MOTTO_VARIANTS.length).toBeGreaterThan(0);
    for (const m of FRONTIER_MOTTO_VARIANTS) {
      expect(m.length).toBeGreaterThan(0);
    }
  });

  it('includes the canonical "hic sunt dracones" (case-insensitive)', () => {
    const joined = FRONTIER_MOTTO_VARIANTS.join(' | ').toLowerCase();
    expect(joined).toMatch(/dracones/);
  });

  it('motto entries are unique', () => {
    expect(new Set(FRONTIER_MOTTO_VARIANTS).size).toBe(FRONTIER_MOTTO_VARIANTS.length);
  });
});

describe('FRONTIER_MOTIF tuning', () => {
  it('alpha is in the subtle range (0, 1)', () => {
    expect(FRONTIER_MOTIF_ALPHA).toBeGreaterThan(0);
    expect(FRONTIER_MOTIF_ALPHA).toBeLessThan(1);
  });

  it('density is a fraction in (0, 1]', () => {
    expect(FRONTIER_MOTIF_DENSITY).toBeGreaterThan(0);
    expect(FRONTIER_MOTIF_DENSITY).toBeLessThanOrEqual(1);
  });

  it('color is a 6-digit hex', () => {
    expect(FRONTIER_MOTIF_COLOR_HEX).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('declares the eldritch tonal register and the colour is drawn from it', () => {
    expect(FRONTIER_MOTIF_REGISTER).toBe('eldritch');
    const eldritchHex = PALETTE_BY_REGISTER.eldritch.map((p) => p.hex);
    expect(eldritchHex).toContain(FRONTIER_MOTIF_COLOR_HEX);
  });
});

describe('pickFrontierMotto', () => {
  it('returns a motto that is one of the variants', () => {
    for (let s = 0; s < 16; s++) {
      expect(FRONTIER_MOTTO_VARIANTS).toContain(pickFrontierMotto(s));
    }
  });

  it('is deterministic: same seed → same motto', () => {
    expect(pickFrontierMotto(42)).toBe(pickFrontierMotto(42));
    expect(pickFrontierMotto(9001)).toBe(pickFrontierMotto(9001));
  });

  it('handles negative and fractional seeds via abs+trunc', () => {
    expect(FRONTIER_MOTTO_VARIANTS).toContain(pickFrontierMotto(-17));
    expect(FRONTIER_MOTTO_VARIANTS).toContain(pickFrontierMotto(3.7));
    expect(pickFrontierMotto(-3)).toBe(pickFrontierMotto(3));
    expect(pickFrontierMotto(3.2)).toBe(pickFrontierMotto(3));
  });
});
