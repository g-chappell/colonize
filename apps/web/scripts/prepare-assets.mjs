#!/usr/bin/env node
// prepare-assets.mjs — pack the placeholder atlas and copy it into
// apps/web/public/atlas/<atlas>/ so Vite serves it at /atlas/<atlas>/…
// Runs on `prebuild` + `predev` so developers never have to remember
// the two-step atlas-src → atlas-out → public pipeline.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const webRoot = resolve(here, '..');
const repoRoot = resolve(webRoot, '..', '..');
const contentRoot = resolve(repoRoot, 'packages/content');

const ATLASES = ['core'];

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`prepare-assets: ${cmd} ${args.join(' ')} failed with code ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

for (const atlas of ATLASES) {
  const srcDir = resolve(contentRoot, `atlas-src/${atlas}`);
  if (!existsSync(srcDir)) {
    console.info(`prepare-assets: no atlas-src/${atlas}; regenerating placeholder sources.`);
    run('node', ['scripts/generate-placeholder-sources.mjs', '--atlas', atlas], contentRoot);
  }
  run('node', ['scripts/pack-atlas.mjs', '--atlas', atlas], contentRoot);

  const packedDir = resolve(contentRoot, `atlas-out/${atlas}`);
  const publicDir = resolve(webRoot, `public/atlas/${atlas}`);
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(dirname(publicDir), { recursive: true });
  cpSync(packedDir, publicDir, { recursive: true });
  console.info(`prepare-assets: copied ${packedDir} → ${publicDir}`);
}
