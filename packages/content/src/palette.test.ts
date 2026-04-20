import { describe, it, expect } from 'vitest';
import { OTK_PALETTE, PALETTE_BY_REGISTER, getPaletteEntry, type ToneRegister } from './palette.js';

const HEX_RE = /^#[0-9a-f]{6}$/;

describe('OTK_PALETTE', () => {
  it('has 48 entries within the 32–64 retro target', () => {
    expect(OTK_PALETTE.length).toBe(48);
    expect(OTK_PALETTE.length).toBeGreaterThanOrEqual(32);
    expect(OTK_PALETTE.length).toBeLessThanOrEqual(64);
  });

  it('uses lower-case 6-digit hex codes', () => {
    for (const entry of OTK_PALETTE) {
      expect(entry.hex).toMatch(HEX_RE);
    }
  });

  it('has unique colour names', () => {
    const names = OTK_PALETTE.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has unique hex codes', () => {
    const hexes = OTK_PALETTE.map((e) => e.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it('partitions evenly across the three tonal registers', () => {
    const registers: ToneRegister[] = ['salt-and-rum', 'eldritch', 'salvaged-futurism'];
    for (const r of registers) {
      expect(PALETTE_BY_REGISTER[r].length).toBe(16);
      for (const entry of PALETTE_BY_REGISTER[r]) {
        expect(entry.register).toBe(r);
      }
    }
  });
});

describe('getPaletteEntry', () => {
  it('returns the entry by name', () => {
    expect(getPaletteEntry('rum_amber')?.hex).toBe('#c08642');
  });

  it('returns undefined for unknown names', () => {
    expect(getPaletteEntry('not_a_real_colour')).toBeUndefined();
  });
});
