#!/usr/bin/env node
// generate-placeholder-audio.mjs — write silent PCM WAV files into
// packages/content/audio-out/ for every stem declared in src/audio.ts.
// Matches the atlas source/packed/served triad: audio-out/ is
// gitignored, then apps/web/scripts/prepare-assets.mjs copies it into
// apps/web/public/audio/ for Vite to serve at /audio/*.
//
// The packed WAVs are intentionally silent — TASK-015 only needs
// something for Phaser's loader and the iOS prime path to decode.
// Real composition lands in a later epic.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUDIO_STEMS } from '../dist/audio.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkgRoot = resolve(here, '..');
const outDir = resolve(pkgRoot, 'audio-out');

mkdirSync(outDir, { recursive: true });

// 8-bit unsigned PCM at 8 kHz mono: smallest valid WAV that every
// browser decoder we ship to accepts. Silent = 0x80 (mid-scale for
// 8-bit unsigned PCM).
const SAMPLE_RATE = 8000;
const BITS_PER_SAMPLE = 8;
const NUM_CHANNELS = 1;
const SILENT_SAMPLE = 0x80;

function writeSilentWav(path, durationMs) {
  const sampleCount = Math.max(1, Math.round((durationMs / 1000) * SAMPLE_RATE));
  const byteRate = (SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (NUM_CHANNELS * BITS_PER_SAMPLE) / 8;
  const dataSize = sampleCount * blockAlign;

  const buf = Buffer.alloc(44 + dataSize);
  // RIFF header
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  // fmt chunk
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(NUM_CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(BITS_PER_SAMPLE, 34);
  // data chunk
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  buf.fill(SILENT_SAMPLE, 44, 44 + dataSize);

  writeFileSync(path, buf);
}

for (const stem of AUDIO_STEMS) {
  const outPath = resolve(outDir, stem.file);
  writeSilentWav(outPath, stem.durationMs);
  console.info(
    `generate-placeholder-audio: wrote ${outPath} (${stem.durationMs}ms silent ${stem.bus})`,
  );
}
