import { describe, it, expect } from 'vitest';
import { FactionVisibility, Visibility } from '@colonize/core';

import { computeFrontierMotifPlacements, isFrontierTile, tileHash } from './fog-edge-motif';

function emptyVis(w: number, h: number): FactionVisibility {
  return new FactionVisibility(w, h);
}

function fullySeenVis(w: number, h: number): FactionVisibility {
  const v = new FactionVisibility(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      v.reveal({ x, y }, 0);
    }
  }
  v.demoteVisibleToSeen();
  return v;
}

describe('tileHash', () => {
  it('is deterministic for the same coords', () => {
    expect(tileHash(3, 5)).toBe(tileHash(3, 5));
    expect(tileHash(0, 0)).toBe(tileHash(0, 0));
  });

  it('distinguishes (x, y) from (y, x)', () => {
    expect(tileHash(3, 5)).not.toBe(tileHash(5, 3));
  });

  it('returns an unsigned 32-bit integer', () => {
    for (const [x, y] of [
      [0, 0],
      [1, 1],
      [10, 7],
      [-3, 4],
    ]) {
      const h = tileHash(x!, y!);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('isFrontierTile', () => {
  it('is false for explored tiles', () => {
    const v = fullySeenVis(3, 3);
    expect(isFrontierTile(v, 1, 1)).toBe(false);
  });

  it('is false for unseen tiles with no explored neighbour', () => {
    const v = emptyVis(5, 5);
    expect(isFrontierTile(v, 2, 2)).toBe(false);
  });

  it('is true for an unseen tile adjacent to a seen tile', () => {
    const v = new FactionVisibility(3, 1);
    v.reveal({ x: 0, y: 0 }, 0);
    v.demoteVisibleToSeen();
    // (0,0) is seen; (1,0) unseen-adjacent-to-seen; (2,0) unseen-far
    expect(isFrontierTile(v, 1, 0)).toBe(true);
    expect(isFrontierTile(v, 2, 0)).toBe(false);
  });

  it('is true for an unseen tile adjacent to a visible tile', () => {
    const v = new FactionVisibility(3, 1);
    v.reveal({ x: 0, y: 0 }, 0);
    expect(isFrontierTile(v, 1, 0)).toBe(true);
  });

  it('ignores diagonal-only neighbours', () => {
    const v = new FactionVisibility(3, 3);
    v.reveal({ x: 0, y: 0 }, 0);
    v.demoteVisibleToSeen();
    // (1,1) is diagonal-only to (0,0); not a frontier tile.
    expect(isFrontierTile(v, 1, 1)).toBe(false);
    // (1,0) and (0,1) ARE orthogonally adjacent.
    expect(isFrontierTile(v, 1, 0)).toBe(true);
    expect(isFrontierTile(v, 0, 1)).toBe(true);
  });
});

describe('computeFrontierMotifPlacements', () => {
  it('returns empty on a fully-unseen map', () => {
    const v = emptyVis(5, 5);
    expect(computeFrontierMotifPlacements(v, 1)).toEqual([]);
  });

  it('returns empty on a fully-explored map (no unseen tiles at all)', () => {
    const v = fullySeenVis(5, 5);
    expect(computeFrontierMotifPlacements(v, 1)).toEqual([]);
  });

  it('density 0 returns no placements even when frontiers exist', () => {
    const v = new FactionVisibility(3, 1);
    v.reveal({ x: 0, y: 0 }, 0);
    expect(computeFrontierMotifPlacements(v, 0)).toEqual([]);
  });

  it('density 1 returns every frontier tile, in-bounds', () => {
    const v = new FactionVisibility(3, 3);
    v.reveal({ x: 1, y: 1 }, 0); // reveal centre (radius 0 = only (1,1))
    v.demoteVisibleToSeen();
    const placements = computeFrontierMotifPlacements(v, 1);
    const coords = placements.map((p) => `${p.x},${p.y}`).sort();
    // Frontier tiles = orthogonal neighbours of (1,1): (0,1),(2,1),(1,0),(1,2)
    expect(coords).toEqual(['0,1', '1,0', '1,2', '2,1']);
    for (const p of placements) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(3);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(3);
    }
  });

  it('never places on explored tiles or unseen-interior tiles', () => {
    const v = new FactionVisibility(5, 5);
    v.reveal({ x: 2, y: 2 }, 1); // visible 3x3 block centred on (2,2)
    v.demoteVisibleToSeen();
    const placements = computeFrontierMotifPlacements(v, 1);
    for (const p of placements) {
      expect(v.get(p.x, p.y)).toBe(Visibility.Unseen);
      expect(isFrontierTile(v, p.x, p.y)).toBe(true);
    }
  });

  it('is deterministic: same inputs produce byte-identical placements', () => {
    const v = new FactionVisibility(6, 6);
    v.reveal({ x: 3, y: 3 }, 1);
    v.demoteVisibleToSeen();
    const a = computeFrontierMotifPlacements(v, 0.5);
    const b = computeFrontierMotifPlacements(v, 0.5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('density monotonically grows (or stays) with higher thresholds', () => {
    // Build a grid with a long frontier line.
    const v = new FactionVisibility(10, 3);
    for (let x = 0; x < 10; x++) {
      v.reveal({ x, y: 0 }, 0);
    }
    v.demoteVisibleToSeen();
    const low = computeFrontierMotifPlacements(v, 0.1).length;
    const mid = computeFrontierMotifPlacements(v, 0.5).length;
    const high = computeFrontierMotifPlacements(v, 1).length;
    expect(low).toBeLessThanOrEqual(mid);
    expect(mid).toBeLessThanOrEqual(high);
    expect(high).toBe(10); // every tile in row y=1 is a frontier tile
  });

  it('clamps out-of-range densities (negative → 0, above-1 → 1)', () => {
    const v = new FactionVisibility(3, 3);
    v.reveal({ x: 1, y: 1 }, 0);
    v.demoteVisibleToSeen();
    expect(computeFrontierMotifPlacements(v, -0.3)).toEqual([]);
    const above = computeFrontierMotifPlacements(v, 2);
    const exact = computeFrontierMotifPlacements(v, 1);
    expect(above).toEqual(exact);
  });
});
