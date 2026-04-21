#!/usr/bin/env node
// generate-placeholder-sources.mjs — write tiny 16×16 PNG placeholder
// sprites into packages/content/atlas-src/<atlas>/ so `pack-atlas.mjs` has
// something to pack before real art lands. Idempotent; safe to re-run.
//
// Usage:
//   node packages/content/scripts/generate-placeholder-sources.mjs [--atlas core]
//
// Pixel data is synthesised from the OTK palette so the placeholder still
// respects the tonal registers. PNG encoding uses pngjs (transitively
// available via free-tex-packer-core).

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

import { OTK_PALETTE } from '../dist/palette.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkgRoot = resolve(here, '..');

function getArg(flag, fallback) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const atlasName = getArg('--atlas', 'core');
const outDir = resolve(pkgRoot, `atlas-src/${atlasName}`);

mkdirSync(outDir, { recursive: true });

const byName = Object.fromEntries(OTK_PALETTE.map((p) => [p.name, p.hex]));

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const SIZE = 16;

// Placeholder tile recipes — each emits one 16×16 PNG whose fill +
// border colours come from the OTK palette. Keeps the placeholder
// atlas on-register rather than rainbow debug colours.
//
// `accent` is optional: when set, the recipe draws an extra
// ornamentation band (see TILE_PATTERNS) so distinct tile types stay
// visually distinguishable at 16px before the art epic ships.
const SPRITES = [
  // Non-terrain chrome (still consumed by the placeholder main-menu preview).
  { name: 'tile_deck', fill: 'driftwood', border: 'whiskey', pattern: 'plain' },
  { name: 'tile_hull', fill: 'riveted_steel', border: 'iron_dark', pattern: 'plain' },

  // Terrain tiles — one per TileType in @colonize/core.
  { name: 'tile_ocean', fill: 'abyssal_teal', border: 'twilight_blue', pattern: 'plain' },
  {
    name: 'tile_ocean_01',
    fill: 'abyssal_teal',
    border: 'twilight_blue',
    accent: 'tidewater_glow',
    pattern: 'waves-a',
  },
  {
    name: 'tile_ocean_02',
    fill: 'abyssal_teal',
    border: 'twilight_blue',
    accent: 'moon_phosphor',
    pattern: 'waves-b',
  },
  {
    name: 'tile_rayon_passage',
    fill: 'nightsky_blue',
    border: 'twilight_blue',
    accent: 'moon_phosphor',
    pattern: 'corridor',
  },
  {
    name: 'tile_island',
    fill: 'driftwood',
    border: 'whiskey',
    accent: 'ochre_dust',
    pattern: 'island',
  },
  {
    name: 'tile_floating_city',
    fill: 'riveted_steel',
    border: 'brass',
    accent: 'safety_amber',
    pattern: 'city',
  },
  {
    name: 'tile_red_tide',
    fill: 'bilge_red',
    border: 'bloodflag_red',
    accent: 'coral_pink',
    pattern: 'tide',
  },
  {
    name: 'tile_fata_morgana',
    fill: 'ink_violet',
    border: 'bruise_violet',
    accent: 'bioluminescent_cyan',
    pattern: 'mirage',
  },
];

function pixelInAccent(pattern, x, y) {
  switch (pattern) {
    case 'plain':
      return false;
    // Two offset single-row wave streaks — the paired frames swap which
    // row is lit to produce the animation.
    case 'waves-a':
      return y === 5 && x >= 3 && x <= 12;
    case 'waves-b':
      return y === 10 && x >= 3 && x <= 12;
    // Central horizontal channel suggesting the Rayon Passage corridor.
    case 'corridor':
      return y === 7 || y === 8;
    // Rough rounded landmass blob centred in the tile.
    case 'island': {
      const dx = x - 7.5;
      const dy = y - 7.5;
      return dx * dx + dy * dy < 18;
    }
    // Cruciform city footprint.
    case 'city':
      return (x === 7 || x === 8) && y >= 3 && y <= 12;
    // Diagonal slash for red-tide currents.
    case 'tide':
      return Math.abs(x - y) <= 1 && x >= 2 && x <= 13;
    // Diamond outline for the fata-morgana shimmer.
    case 'mirage': {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      return d > 4 && d < 6;
    }
    default:
      return false;
  }
}

function drawTile(fillHex, borderHex, accentHex, pattern) {
  const png = new PNG({ width: SIZE, height: SIZE });
  const [fr, fg, fb] = hexToRgb(fillHex);
  const [br, bg, bb] = hexToRgb(borderHex);
  const [ar, ag, ab] = accentHex ? hexToRgb(accentHex) : [fr, fg, fb];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      const isAccent = !isBorder && accentHex && pixelInAccent(pattern, x, y);
      const idx = (y * SIZE + x) << 2;
      png.data[idx] = isBorder ? br : isAccent ? ar : fr;
      png.data[idx + 1] = isBorder ? bg : isAccent ? ag : fg;
      png.data[idx + 2] = isBorder ? bb : isAccent ? ab : fb;
      png.data[idx + 3] = 0xff;
    }
  }
  return PNG.sync.write(png);
}

for (const sprite of SPRITES) {
  const fillHex = byName[sprite.fill];
  const borderHex = byName[sprite.border];
  if (!fillHex || !borderHex) {
    console.error(
      `generate-placeholder-sources: unknown palette entry ${sprite.fill}/${sprite.border}`,
    );
    process.exit(1);
  }
  const accentHex = sprite.accent ? byName[sprite.accent] : undefined;
  if (sprite.accent && !accentHex) {
    console.error(`generate-placeholder-sources: unknown palette entry ${sprite.accent}`);
    process.exit(1);
  }
  const buffer = drawTile(fillHex, borderHex, accentHex, sprite.pattern);
  const outPath = resolve(outDir, `${sprite.name}.png`);
  const existed = existsSync(outPath);
  writeFileSync(outPath, buffer);
  console.info(`generate-placeholder-sources: ${existed ? 'updated' : 'wrote'} ${outPath}`);
}
