#!/usr/bin/env node
// pack-atlas.mjs — pack PNG sprites into a Phaser-compatible texture atlas.
//
// Layout:
//   packages/content/atlas-src/<atlas>/*.png  — input sprites (one folder per atlas)
//   packages/content/atlas-out/<atlas>/spritesheet.{png,json}  — output (gitignored)
//
// Usage:
//   npm run pack-atlas --workspace=packages/content -- [--atlas <name>] [--src <dir>] [--out <dir>]
//
// Wraps free-tex-packer-core (https://github.com/odrick/free-tex-packer-core)
// with a JsonHash exporter — the format Phaser 3's `load.atlas()` consumes.

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import texturePacker from 'free-tex-packer-core';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkgRoot = resolve(here, '..');

function getArg(flag, fallback) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const atlasName = getArg('--atlas', 'core');
const srcDir = resolve(pkgRoot, getArg('--src', `atlas-src/${atlasName}`));
const outDir = resolve(pkgRoot, getArg('--out', `atlas-out/${atlasName}`));

if (!existsSync(srcDir)) {
  console.info(`pack-atlas: no input directory at ${srcDir} — nothing to pack.`);
  process.exit(0);
}

const inputs = readdirSync(srcDir, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.png'))
  .map((d) => ({ path: d.name, contents: readFileSync(join(srcDir, d.name)) }));

if (inputs.length === 0) {
  console.info(`pack-atlas: no .png files in ${srcDir} — nothing to pack.`);
  process.exit(0);
}

const options = {
  textureName: 'spritesheet',
  width: 1024,
  height: 1024,
  fixedSize: false,
  powerOfTwo: true,
  padding: 2,
  allowRotation: false,
  allowTrim: true,
  exporter: 'JsonHash',
  removeFileExtension: true,
  prependFolderName: false,
  appInfo: { name: '@colonize/content pack-atlas', version: '0.1.0' },
};

texturePacker(inputs, options, (files, error) => {
  if (error) {
    console.error('pack-atlas: pack failed:', error);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  for (const file of files) {
    const out = join(outDir, basename(file.name));
    writeFileSync(out, file.buffer);
    console.info(`pack-atlas: wrote ${out}`);
  }
});
