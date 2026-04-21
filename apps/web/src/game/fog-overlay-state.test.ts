import { describe, it, expect } from 'vitest';
import { FactionVisibility, Visibility } from '@colonize/core';

import {
  FOG_ALPHA_SEEN,
  FOG_ALPHA_UNSEEN,
  FOG_ALPHA_VISIBLE,
  FOG_COLOR,
  FOG_REVEAL_DURATION_MS,
  FogOverlayState,
  fogAlphaFor,
  interpolateFogAlpha,
} from './fog-overlay-state';

describe('fog alpha constants', () => {
  it('orders alpha so unseen is fully opaque and visible is clear', () => {
    expect(FOG_ALPHA_VISIBLE).toBe(0);
    expect(FOG_ALPHA_UNSEEN).toBe(1);
    expect(FOG_ALPHA_SEEN).toBeGreaterThan(FOG_ALPHA_VISIBLE);
    expect(FOG_ALPHA_SEEN).toBeLessThan(FOG_ALPHA_UNSEEN);
  });

  it('uses black as the fog tint', () => {
    expect(FOG_COLOR).toBe(0x000000);
  });
});

describe('fogAlphaFor', () => {
  it('maps each visibility state to its alpha', () => {
    expect(fogAlphaFor(Visibility.Unseen)).toBe(FOG_ALPHA_UNSEEN);
    expect(fogAlphaFor(Visibility.Seen)).toBe(FOG_ALPHA_SEEN);
    expect(fogAlphaFor(Visibility.Visible)).toBe(FOG_ALPHA_VISIBLE);
  });
});

describe('interpolateFogAlpha', () => {
  it('returns endpoints at progress 0 and 1', () => {
    expect(interpolateFogAlpha(1, 0, 0)).toBe(1);
    expect(interpolateFogAlpha(1, 0, 1)).toBe(0);
  });

  it('is linear at the midpoint', () => {
    expect(interpolateFogAlpha(1, 0, 0.5)).toBeCloseTo(0.5);
    expect(interpolateFogAlpha(0.5, 0, 0.5)).toBeCloseTo(0.25);
  });

  it('clamps out-of-range progress', () => {
    expect(interpolateFogAlpha(1, 0, -1)).toBe(1);
    expect(interpolateFogAlpha(1, 0, 2)).toBe(0);
  });
});

describe('FogOverlayState construction', () => {
  it('snapshots the initial visibility grid', () => {
    const vis = new FactionVisibility(3, 2);
    vis.reveal({ x: 0, y: 0 }, 0); // visible at (0,0)
    const state = new FogOverlayState(3, 2, vis);
    expect(state.width).toBe(3);
    expect(state.height).toBe(2);
    expect(state.sampleAlpha(0, 0, 0)).toBe(FOG_ALPHA_VISIBLE);
    expect(state.sampleAlpha(1, 0, 0)).toBe(FOG_ALPHA_UNSEEN);
  });

  it('rejects dimension mismatch against the initial grid', () => {
    const vis = new FactionVisibility(3, 2);
    expect(() => new FogOverlayState(4, 2, vis)).toThrow(RangeError);
    expect(() => new FogOverlayState(3, 3, vis)).toThrow(RangeError);
  });
});

describe('FogOverlayState.sync', () => {
  it('rejects dimension mismatch on sync', () => {
    const a = new FactionVisibility(2, 2);
    const b = new FactionVisibility(3, 2);
    const state = new FogOverlayState(2, 2, a);
    expect(() => state.sync(b, 0)).toThrow(RangeError);
  });

  it('is a no-op when nothing changed', () => {
    const vis = new FactionVisibility(2, 2);
    vis.reveal({ x: 0, y: 0 }, 0);
    const state = new FogOverlayState(2, 2, vis);
    state.sync(vis, 100);
    expect(state.hasActiveTransitions(100)).toBe(false);
    expect(state.sampleAlpha(0, 0, 100)).toBe(FOG_ALPHA_VISIBLE);
    expect(state.sampleAlpha(1, 1, 100)).toBe(FOG_ALPHA_UNSEEN);
  });

  it('starts an animated reveal on unseen→seen transitions', () => {
    const before = new FactionVisibility(2, 1);
    const state = new FogOverlayState(2, 1, before);
    expect(state.sampleAlpha(0, 0, 0)).toBe(FOG_ALPHA_UNSEEN);

    const after = new FactionVisibility(2, 1);
    after.reveal({ x: 0, y: 0 }, 0);
    after.demoteVisibleToSeen(); // cell is now Seen
    state.sync(after, 1000);

    // Mid-animation: alpha is interpolated toward the target.
    expect(state.hasActiveTransitions(1000)).toBe(true);
    const halfway = state.sampleAlpha(0, 0, 1000 + FOG_REVEAL_DURATION_MS / 2);
    expect(halfway).toBeCloseTo((FOG_ALPHA_UNSEEN + FOG_ALPHA_SEEN) / 2);

    // End of animation: settles to the target alpha.
    const settled = state.sampleAlpha(0, 0, 1000 + FOG_REVEAL_DURATION_MS);
    expect(settled).toBe(FOG_ALPHA_SEEN);
    expect(state.hasActiveTransitions(1000 + FOG_REVEAL_DURATION_MS)).toBe(false);
  });

  it('starts an animated reveal on unseen→visible transitions', () => {
    const before = new FactionVisibility(1, 1);
    const state = new FogOverlayState(1, 1, before);

    const after = new FactionVisibility(1, 1);
    after.reveal({ x: 0, y: 0 }, 0);
    state.sync(after, 500);

    const halfway = state.sampleAlpha(0, 0, 500 + FOG_REVEAL_DURATION_MS / 2);
    expect(halfway).toBeCloseTo((FOG_ALPHA_UNSEEN + FOG_ALPHA_VISIBLE) / 2);
    expect(state.sampleAlpha(0, 0, 500 + FOG_REVEAL_DURATION_MS)).toBe(FOG_ALPHA_VISIBLE);
  });

  it('snaps instantly on visible→seen demotions (no animation)', () => {
    const before = new FactionVisibility(1, 1);
    before.reveal({ x: 0, y: 0 }, 0); // visible
    const state = new FogOverlayState(1, 1, before);
    expect(state.sampleAlpha(0, 0, 0)).toBe(FOG_ALPHA_VISIBLE);

    const after = new FactionVisibility(1, 1);
    after.reveal({ x: 0, y: 0 }, 0);
    after.demoteVisibleToSeen();
    state.sync(after, 2000);

    expect(state.hasActiveTransitions(2000)).toBe(false);
    expect(state.sampleAlpha(0, 0, 2000)).toBe(FOG_ALPHA_SEEN);
  });

  it('snaps instantly on seen→visible re-reveals (already-known terrain)', () => {
    const before = new FactionVisibility(1, 1);
    before.reveal({ x: 0, y: 0 }, 0);
    before.demoteVisibleToSeen(); // seen
    const state = new FogOverlayState(1, 1, before);

    const after = new FactionVisibility(1, 1);
    after.reveal({ x: 0, y: 0 }, 0); // visible again
    state.sync(after, 3000);

    expect(state.hasActiveTransitions(3000)).toBe(false);
    expect(state.sampleAlpha(0, 0, 3000)).toBe(FOG_ALPHA_VISIBLE);
  });

  it('handles re-syncs mid-animation by restarting from the current alpha', () => {
    const before = new FactionVisibility(1, 1);
    const state = new FogOverlayState(1, 1, before);

    const afterSeen = new FactionVisibility(1, 1);
    afterSeen.reveal({ x: 0, y: 0 }, 0);
    afterSeen.demoteVisibleToSeen();
    state.sync(afterSeen, 0);

    // Halfway through the first tween — alpha is mid-fade.
    const midAlpha = state.sampleAlpha(0, 0, FOG_REVEAL_DURATION_MS / 2);
    expect(midAlpha).toBeGreaterThan(FOG_ALPHA_SEEN);
    expect(midAlpha).toBeLessThan(FOG_ALPHA_UNSEEN);

    // Now the tile cannot unseen→seen again (it's already Seen), so no
    // new tween starts; the existing one plays out to completion.
    expect(state.sampleAlpha(0, 0, FOG_REVEAL_DURATION_MS)).toBe(FOG_ALPHA_SEEN);
  });
});

describe('FogOverlayState.hasActiveTransitions', () => {
  it('reports false on an idle state', () => {
    const vis = new FactionVisibility(2, 2);
    const state = new FogOverlayState(2, 2, vis);
    expect(state.hasActiveTransitions(0)).toBe(false);
  });

  it('reports true only while transitions are still in flight', () => {
    const before = new FactionVisibility(1, 1);
    const state = new FogOverlayState(1, 1, before);

    const after = new FactionVisibility(1, 1);
    after.reveal({ x: 0, y: 0 }, 0);
    state.sync(after, 1000);

    expect(state.hasActiveTransitions(1000)).toBe(true);
    expect(state.hasActiveTransitions(1000 + FOG_REVEAL_DURATION_MS - 1)).toBe(true);
    expect(state.hasActiveTransitions(1000 + FOG_REVEAL_DURATION_MS)).toBe(false);
  });
});
