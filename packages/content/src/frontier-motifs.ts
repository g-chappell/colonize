// Frontier motifs — flavour text drawn faintly on the fog-of-war side
// of explored territory, in the spirit of old cartography's
// "hic sunt dracones" annotations at the edge of the known world.
//
// Canon register: eldritch. The Kraken-lit abyss beyond the Order's
// explored shallows is the thematic cousin of the medieval cartographer's
// unfilled parchment — unknown, watched, not yet named. The OTK register
// leans into that with a muted ghost-jade ink. No mechanical effect;
// the Phaser layer consumes these values to render subtle Text glyphs
// and a small Graphics sigil at a deterministically sparse subset of
// edge-of-fog tiles.

import type { ToneRegister } from './palette.js';

export const FRONTIER_MOTIF_REGISTER: ToneRegister = 'eldritch';

// Latin-ish mottoes drawn in the fog. Kept short so a single tile can
// hold the glyph + line without spilling into neighbours at the default
// TILE_RENDER_SCALE. Unicode interpunct (·) mirrors the engraved look
// on historical maps.
export const FRONTIER_MOTTO_VARIANTS: readonly string[] = [
  'HIC · SVNT · DRACONES',
  'MARE · INCOGNITVM',
  'VLTRA · TENEBRIS',
  'FINIS · TABVLAE',
];

// Ghost-jade from the eldritch register — subtle on black fog, readable
// against the half-dimmed seen state too. Mirrored as a literal here
// rather than resolved at import-time so tests can pin the exact hex
// without touching the palette index.
export const FRONTIER_MOTIF_COLOR_HEX = '#6ab39d';

// Low alpha — the motif is a flavour breath, not a UI element. Keeps
// the map readable and avoids drowning terrain on zoomed-out views.
export const FRONTIER_MOTIF_ALPHA = 0.35;

// Fraction of eligible edge-of-fog tiles that display a motif. ~6%
// spreads four-ish mottoes across a typical frontier without turning
// the border into a wall of text.
export const FRONTIER_MOTIF_DENSITY = 0.06;

// Deterministic motto pick for a given seed. Callers pass a per-tile
// hash so two placements on the same tile always read the same motto.
export function pickFrontierMotto(seed: number): string {
  const i = Math.abs(Math.trunc(seed)) % FRONTIER_MOTTO_VARIANTS.length;
  return FRONTIER_MOTTO_VARIANTS[i]!;
}
