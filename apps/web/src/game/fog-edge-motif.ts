import { Visibility } from '@colonize/core';
import type { FactionVisibility } from '@colonize/core';

// Pure-sibling helper for the fog-edge motif layer. Identifies tiles
// at the edge of explored territory — unseen tiles adjacent to
// seen-or-visible tiles — and deterministically picks a sparse subset
// to decorate with a "hic sunt dracones" motif. No Phaser imports; the
// Phaser wrapper in `fog-edge-motif-layer.ts` consumes the placement
// list.

export interface FrontierMotifPlacement {
  readonly x: number;
  readonly y: number;
  // Passed straight to `pickFrontierMotto(seed)` / used as a rotation
  // seed. A simple deterministic function of the tile coordinates so
  // the same (x, y) always renders the same motto at the same angle.
  readonly seed: number;
}

// 4-connectivity: the diagonal-only neighbour shares a corner but not a
// fog edge, so decorating that case reads as a sprinkle rather than a
// border. Keep it tight.
const NEIGHBOUR_OFFSETS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// Small integer hash of a tile coord. Enough mixing that density
// filtering doesn't produce visible regular striping on small maps.
export function tileHash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function isExplored(v: Visibility): boolean {
  return v === Visibility.Seen || v === Visibility.Visible;
}

export function isFrontierTile(visibility: FactionVisibility, x: number, y: number): boolean {
  if (visibility.get(x, y) !== Visibility.Unseen) return false;
  for (const [dx, dy] of NEIGHBOUR_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!visibility.inBounds(nx, ny)) continue;
    if (isExplored(visibility.get(nx, ny))) return true;
  }
  return false;
}

// Returns the sparse subset of frontier tiles that should render a
// motif. Deterministic given the same visibility grid + density — the
// same tile is always either decorated or not, regardless of
// iteration order or when `sync` runs.
//
// `density` is clamped to [0, 1]; outside callers shouldn't rely on
// extrapolation. 0 → no placements; 1 → every frontier tile.
export function computeFrontierMotifPlacements(
  visibility: FactionVisibility,
  density: number,
): FrontierMotifPlacement[] {
  const clamped = Math.max(0, Math.min(1, density));
  if (clamped === 0) return [];
  const placements: FrontierMotifPlacement[] = [];
  const threshold = Math.floor(clamped * 0xffffffff);
  for (let y = 0; y < visibility.height; y++) {
    for (let x = 0; x < visibility.width; x++) {
      if (!isFrontierTile(visibility, x, y)) continue;
      const seed = tileHash(x, y);
      if (clamped >= 1 || seed <= threshold) {
        placements.push({ x, y, seed });
      }
    }
  }
  return placements;
}
