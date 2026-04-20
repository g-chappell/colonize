# @colonize/content

Static game content for Colonize: lore strings, palette, audio, and the
texture-atlas authoring pipeline. Pure data — no game logic, no rendering.

## OTK retro palette

48 hand-picked colours partitioned across the three Colonize tonal
registers. Used both for sprite authoring and for any palette-locked
runtime rendering (e.g. fog, filters, UI accents).

| Register             | Count | Mood                                    |
| -------------------- | ----- | --------------------------------------- |
| `salt-and-rum`       | 16    | Warm, weathered, pirate-flag, parchment |
| `eldritch`           | 16    | Abyssal teals, ink violets, bio-cyan    |
| `salvaged-futurism`  | 16    | Steel, oxide, coolant, fission glow     |

Source: [`src/palette.ts`](src/palette.ts). Use `OTK_PALETTE` for the
flat list, `PALETTE_BY_REGISTER` to iterate by register, or
`getPaletteEntry('rum_amber')` to look up by name.

When authoring sprites, restrict colours to entries from this palette
so the look stays coherent across artists and registers.

## Atlas pipeline

`scripts/pack-atlas.mjs` packs PNG sprites into a single texture atlas
that Phaser 3 can load via `this.load.atlas()`. It wraps
[`free-tex-packer-core`](https://github.com/odrick/free-tex-packer-core)
with the `JsonHash` exporter.

### Layout

```
packages/content/
├── atlas-src/<atlas-name>/*.png   ← input sprites (committed)
└── atlas-out/<atlas-name>/        ← generated output (gitignored)
    ├── spritesheet.png
    └── spritesheet.json
```

Group sprites that ship together into one atlas folder
(e.g. `atlas-src/units/`, `atlas-src/ui/`). The folder name becomes the
`--atlas` argument.

### Run

```bash
# default atlas: "core"
npm run pack-atlas --workspace=packages/content

# named atlas
npm run pack-atlas --workspace=packages/content -- --atlas units
```

Flags:

- `--atlas <name>` — named atlas; reads from `atlas-src/<name>/`,
  writes to `atlas-out/<name>/`. Default `core`.
- `--src <dir>` — override input dir (relative to `packages/content`).
- `--out <dir>` — override output dir (relative to `packages/content`).

The script is safe to run before any sprites exist: if the input
directory is missing or empty it logs a notice and exits 0.

### Loading in Phaser

```ts
this.load.atlas(
  'core',
  '/atlas/core/spritesheet.png',
  '/atlas/core/spritesheet.json',
);
```

Wiring `atlas-out/` into the web build's static-assets path is handled
in TASK-010 (Phaser boot scene).
