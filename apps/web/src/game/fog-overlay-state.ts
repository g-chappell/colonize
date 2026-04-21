import { Visibility } from '@colonize/core';
import type { FactionVisibility } from '@colonize/core';

// Fog overlay is a single black rectangle per tile whose alpha encodes
// the visibility state: fully opaque hides the tile completely, half
// alpha dims it to a "last seen" snapshot, zero alpha lets the tile
// render normally.
export const FOG_COLOR = 0x000000;
export const FOG_ALPHA_UNSEEN = 1;
export const FOG_ALPHA_SEEN = 0.5;
export const FOG_ALPHA_VISIBLE = 0;

// Duration of the unseen→seen/visible reveal animation. Chosen to feel
// responsive without blocking turn pacing; tweak freely.
export const FOG_REVEAL_DURATION_MS = 400;

export function fogAlphaFor(v: Visibility): number {
  switch (v) {
    case Visibility.Unseen:
      return FOG_ALPHA_UNSEEN;
    case Visibility.Seen:
      return FOG_ALPHA_SEEN;
    case Visibility.Visible:
      return FOG_ALPHA_VISIBLE;
  }
}

export function interpolateFogAlpha(from: number, to: number, progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return from + (to - from) * t;
}

interface TileTransition {
  readonly from: number;
  readonly to: number;
  readonly startMs: number;
  readonly durationMs: number;
}

// Tracks the per-tile fog alpha for a single faction's visibility model
// and drives animated reveals on unseen→seen / unseen→visible
// transitions. Demotions (visible→seen) and re-reveals of already-seen
// cells snap instantly — only the "something new on the map" moment
// gets the fade, matching the task's "animated reveal when a tile
// transitions unseen→seen" brief.
export class FogOverlayState {
  readonly width: number;
  readonly height: number;
  private readonly current: Visibility[];
  private readonly transitions = new Map<number, TileTransition>();

  constructor(width: number, height: number, initial: FactionVisibility) {
    if (initial.width !== width || initial.height !== height) {
      throw new RangeError(
        `FogOverlayState: initial visibility grid ${initial.width}x${initial.height} ` +
          `does not match expected ${width}x${height}`,
      );
    }
    this.width = width;
    this.height = height;
    this.current = new Array<Visibility>(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.current[this.indexOf(x, y)] = initial.get(x, y);
      }
    }
  }

  sync(next: FactionVisibility, nowMs: number): void {
    if (next.width !== this.width || next.height !== this.height) {
      throw new RangeError(
        `FogOverlayState.sync: grid dimensions ${next.width}x${next.height} ` +
          `do not match ${this.width}x${this.height}`,
      );
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = this.indexOf(x, y);
        const before = this.current[idx]!;
        const after = next.get(x, y);
        if (before === after) continue;
        if (before === Visibility.Unseen) {
          const startAlpha = this.sampleAlpha(x, y, nowMs);
          this.transitions.set(idx, {
            from: startAlpha,
            to: fogAlphaFor(after),
            startMs: nowMs,
            durationMs: FOG_REVEAL_DURATION_MS,
          });
        } else {
          this.transitions.delete(idx);
        }
        this.current[idx] = after;
      }
    }
  }

  sampleAlpha(x: number, y: number, nowMs: number): number {
    const idx = this.indexOf(x, y);
    const target = fogAlphaFor(this.current[idx]!);
    const tx = this.transitions.get(idx);
    if (!tx) return target;
    const progress = tx.durationMs > 0 ? (nowMs - tx.startMs) / tx.durationMs : 1;
    if (progress >= 1) {
      this.transitions.delete(idx);
      return target;
    }
    return interpolateFogAlpha(tx.from, tx.to, progress);
  }

  hasActiveTransitions(nowMs: number): boolean {
    let active = false;
    for (const [idx, tx] of this.transitions) {
      if (nowMs < tx.startMs + tx.durationMs) {
        active = true;
      } else {
        this.transitions.delete(idx);
      }
    }
    return active;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
