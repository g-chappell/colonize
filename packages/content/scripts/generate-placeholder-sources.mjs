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
const SPRITES = [
  { name: 'tile_ocean', fill: 'abyssal_teal', border: 'twilight_blue' },
  { name: 'tile_deck', fill: 'driftwood', border: 'whiskey' },
  { name: 'tile_hull', fill: 'riveted_steel', border: 'iron_dark' },
];

function drawTile(fillHex, borderHex) {
  const png = new PNG({ width: SIZE, height: SIZE });
  const [fr, fg, fb] = hexToRgb(fillHex);
  const [br, bg, bb] = hexToRgb(borderHex);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      const idx = (y * SIZE + x) << 2;
      png.data[idx] = isBorder ? br : fr;
      png.data[idx + 1] = isBorder ? bg : fg;
      png.data[idx + 2] = isBorder ? bb : fb;
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
  const buffer = drawTile(fillHex, borderHex);
  const outPath = resolve(outDir, `${sprite.name}.png`);
  const existed = existsSync(outPath);
  writeFileSync(outPath, buffer);
  console.info(`generate-placeholder-sources: ${existed ? 'updated' : 'wrote'} ${outPath}`);
}
