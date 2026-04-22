# CLAUDE.md — Colonize

> Three tiers of rules live here, clearly separated. `autonomous-review` only
> proposes additions to Tier 2 (project conventions) and Tier 3 (tech-coupled).
> Tier 1 (universal rules) is frozen — do not edit.

## Project overview

Colonize is a 2D retro 4X game — a reimagining of Sid Meier's Colonization — set in the **Order of the Kraken** universe (post-Collapse water world, NW 2191 / Early Liberty Era). Cross-platform: web (PC/laptop) and mobile (iOS + Android). Single-player at launch; multiplayer and sky/deep gameplay are deliberate post-MVP expansions.

Canonical lore source: `lore/` (OTK Universe Reference). Vision: `~/.claude/memory/project_colonize_vision.md`.

## Tech stack

- **Language:** TypeScript (strict mode, project references)
- **Game rendering:** Phaser 3 (HTML5 canvas, 2D tilemap)
- **UI shell:** React 18 + Vite
- **Mobile:** Capacitor (iOS + Android wrappers around the web build)
- **Server:** Fastify + Node 20
- **Database:** Postgres 16 (via docker-compose)
- **Monorepo:** npm workspaces (`apps/*`, `packages/*`)
- **Test framework:** Vitest (unit) + Playwright (e2e for web)
- **Lint/format:** ESLint flat config + Prettier
- **CI:** GitHub Actions
- **Deploy:** docker compose on VPS (target: `colonize.blacksail.dev`), nginx reverse-proxy, Let's Encrypt TLS
- **Hosting:** Hostinger VPS `srv1604573.hstgr.cloud` (72.61.207.12)

## Key commands

```bash
npm run dev         # start web dev server (apps/web, Vite)
npm test            # run tests across all workspaces (--workspaces --if-present)
npm run typecheck   # tsc -b (TS project-references build)
npm run lint        # eslint .
npm run build       # build across all workspaces
```

## Workspace structure

```
colonize/
├── apps/
│   ├── web/         # React + Phaser 3 web client (Vite)
│   ├── mobile/      # Capacitor wrapper → iOS + Android
│   └── server/      # Fastify API (auth, cloud save, ads/IAP receipts)
└── packages/
    ├── core/        # Game engine logic (pure TS: state, rules, turn logic)
    ├── content/     # Tile atlases, lore text, audio, localisation
    └── shared/      # DTOs + Zod schemas shared between server and clients
```

**Dependency direction:** `web`/`mobile`/`server` → `core`/`shared`/`content`. Never the other way. `core` imports nothing game-specific; `shared` has only types + Zod; `content` is pure data.

---

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- Tier 1 — UNIVERSAL RULES. Frozen. autonomous-review will never modify. -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Universal rules

- Only implement exactly what is requested. Do not add extra systems, abstractions, or features beyond the scope of the ask.
- Edit one file at a time. Run typecheck + targeted tests after each edit before moving to the next.
- Read the full file/component before modifying it. Verify all sibling elements, handlers, and conditional branches survive the edit.
- Never skip tests after a change — even a "trivial" one. UI changes especially need explicit verification.
- If you notice unrelated brokenness, flag it; do not fix in the same PR.
- Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs).
- Default to writing no comments. Only add when the **why** is non-obvious.
- Never introduce security vulnerabilities (command injection, XSS, SQL injection, OWASP top 10). Fix immediately if you notice.
- Do not take destructive git actions (force-push to main, hard-reset, amend published commits) without explicit user approval.
- Never commit secrets (.env, credentials). Warn if a user asks to.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- Tier 2 — PROJECT CONVENTIONS. Edit freely. autonomous-review may append. -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Project conventions

- **Lore canon is authoritative.** The OTK Universe Reference (in `lore/`) is the source of truth for setting, factions, ships, iconography, tone. Narrative/UI text must respect `[ESTABLISHED]` / `[DRAFT]` / `[OPEN]` tiers — never invent canon to fill `[OPEN]` gaps; surface them as "fragmentary" flavour instead.
- **MVP excludes** (do not implement until explicitly scoped in): multiplayer, sky gameplay, Deep/underwater gameplay, Azure Dominion as on-stage faction, Abyssal Horror combat, resolutions of canon `[OPEN]` items.
- **Playable factions (v1):** Order of the Kraken, Ironclad Syndicate, Phantom Corsairs, Bloodborne Legion. Other factions are NPC-encounter only.
- **Tithe authority:** the Rayon Concord (system-imposed, not a playable faction).
- **Three tonal registers** (tag flavour-text surfaces): salt-and-rum · eldritch · salvaged-futurism.

## Workflow & PR conventions

- **Branch-as-payload:** roadmap status changes travel through the PR branch, never committed directly to main.
- **One task per PR.** No mixing unrelated changes.
- **PR body template:** task id + title, brief summary, test evidence (counts), any non-obvious tradeoffs.
- **Commit messages:** imperative mood, ≤ 72-char subject, optional body. Co-author line for agent-authored commits.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- Tier 3 — TECH-COUPLED RULES. Evolves with the stack. -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Testing patterns

- **Game-logic unit tests** live beside the code in `packages/core` — pure-TS, Vitest, no DOM. Every rule or resolver gets a test.
- **Shared schemas** in `packages/shared` are validated with Zod; tests verify round-trip serialisation.
- **Web e2e** via Playwright when/if added — smoke-test happy paths only.
- **Phaser scene tests** are hard; prefer logic-first tests. Scene behaviour is verified via Playwright on the built web app.
- **Browser-only libraries under jsdom.** Libraries like Phaser 3 run canvas/WebGL probes at module-load time (e.g. `CanvasFeatures.init` calls `canvas.getContext('2d')`), which throws inside Vitest's jsdom environment. Never `import` them at the top of a module a test pulls in. Two pieces together: (a) dynamic-import the library *inside* a React effect or lazy factory — `void import('./game').then(({ createGame }) => …)` — so the library never enters the test module graph; and (b) in `apps/web/src/test-setup.ts`, override `HTMLCanvasElement.prototype.getContext` to a `() => null` stub so any intentional mount-guard probes stay quiet instead of spraying jsdom's "not implemented" virtualConsole warnings.
- **Pure-sibling module pattern for Phaser game code.** Non-trivial arithmetic, state machines, or decision logic used by a Phaser scene/object lives in a *pure-TS sibling module* under `apps/web/src/game/` that has no Phaser in its transitive import closure. The Phaser-integrating module (scene, GameObject wrapper) imports the pure sibling; the pure sibling imports only `@colonize/core`, `@colonize/shared`, `@colonize/content`, and Node built-ins. Canonical examples: `camera-controls.ts` tested + `game-scene.ts` untested (TASK-020); `tile-atlas.ts` layout maths tested + `game-scene.ts` untested (TASK-019); `fog-overlay-state.ts` alpha/transition state tested + `fog-overlay.ts` RenderTexture wrapper untested (TASK-022). Reason: the `getContext → null` stub in `test-setup.ts` silences the jsdom warning but does *not* isolate tests from Phaser's module-load side-effects (canvas feature detection, WebGL gl probe, input manager globals). Once Phaser enters any module's transitive closure the test environment picks it up and flakes on platform-specific paths. The *only* reliable fix is to never import it at all, which means every testable game-logic concept needs a sibling-module home before the Phaser file is written. New Phaser code that contains branching logic or mutable state belongs in a sibling first; the Phaser file keeps to wiring + draw calls.

## Scaffolding hygiene

- **Gitignore new tooling artefacts in the same PR that introduces the tool.** When scaffolding a new dependency, audit what the tool writes to disk on first use (`*.tsbuildinfo` for `tsc -b`, `ios/App/App/public/` and `capacitor.config.json` copies for `npx cap sync`, `build/`/`.gradle/`/`DerivedData/`/`Pods/` for native mobile builds, etc.) and add them to `.gitignore` before opening the PR. This avoids per-task follow-up commits cleaning up leaked artefacts.

## Architecture notes

- **Pure core, impure shells.** `packages/core` is framework-free TS — it must run in Node (for server simulation + tests) and browser (for client). No `window`, no Phaser imports, no React.
- **Rendering split + cross-side event bus.** React owns DOM chrome (menus, tooltips, HUD), Phaser owns the game canvas. Cross-side communication is the singleton bus at `apps/web/src/bus.ts` — whose wire contract is the `GameEvents` interface exported from `packages/shared/src/index.ts`. Extend `GameEvents` via declaration (one new key per event type) as new handshakes are needed: current members include `'turn:advanced'`, `'unit:selected'`, `'game:pause'`, `'game:resume'`. React components emit bus events directly from handlers/effects; *React-side subscribers that touch the Phaser game instance* live inside `GameCanvas.useEffect` — the only scope where the instance exists — and are torn down in the useEffect cleanup alongside `game.destroy(true)`. React code never holds an external ref to the `Phaser.Game`; Phaser code never imports React. Canonical listener pattern: `busUnsubscribes.push(bus.on('game:pause', () => gameInstance?.scene.pause(SCENE_KEYS.game)))` inside the post-`createGame` block of `GameCanvas.useEffect` (TASK-016). This keeps the Phaser lifecycle symmetric (all create/destroy/subscribe/unsubscribe in one effect) and the React tree testable without Phaser in its import graph — tests can drive the bus directly with `bus.emit`/`bus.on` and assert store or DOM side-effects without mounting `GameCanvas`.
- **Server API contract:** every endpoint's request + response schema lives in `packages/shared`. Client and server both import from there; mismatches become typecheck errors.
- **Save format:** `packages/core` exports `serialize/deserialize` for game state. Same format used for local save and cloud save. Version with an integer; add migrations in `packages/core/migrations/`.
- **String-literal const-objects for save-format-bound kinds.** Categorical types that round-trip through the save format (TileType, ResourceType, BuildingType, ProfessionType, UnitType, FactionId, etc.) are declared as a `const` object of string literals plus a derived type alias — see `packages/core/src/map/tile.ts` (`export const TileType = { Ocean: 'ocean', ... } as const; export type TileType = (typeof TileType)[keyof typeof TileType]`). Pair each with an `ALL_<KIND>S` readonly array and an `is<Kind>(value): value is <Kind>` narrowing guard so `fromJSON`-style revivers can validate untrusted input cell-by-cell. Avoid TypeScript `enum` (regular `enum` inflates the `@colonize/core` runtime surface with a redundant object since the type alias already gives us autocompletion + exhaustiveness; `const enum` is unsafe under `isolatedModules: true` and silently breaks across project-reference boundaries). The string values are the wire format — they appear verbatim in serialized save JSON, so pick stable kebab-case identifiers and never re-spell them; rename via a save-version migration, not a refactor.
- **Mobile:** `apps/mobile` is a Capacitor wrapper around `apps/web`'s build output. Never duplicate web UI code — all shared UI lives in `apps/web`.
- **Cross-workspace TS imports** resolve via the `node_modules/@colonize/*` symlinks created by npm workspaces; the importing workspace also adds a `references: [{ "path": "../../packages/<dep>" }]` entry to its `tsconfig.json` so `tsc -b` builds dependencies in the right order. No `paths` aliases are needed in tsconfig or `vite.config.ts`. Run `npm install` at the repo root after adding any new workspace `package.json` so the symlinks materialise before `--workspace=…` commands run.
- **Generated asset pipelines use the source/packed/served triad.** For any binary asset that gets preprocessed before the web app consumes it (atlas sprites today; audio stems, tilemap exports, shader blobs later): commit the *source* inputs under `packages/content/<asset>-src/<name>/` so CI has deterministic input, gitignore the *packed* output under `packages/content/<asset>-out/` (regenerated per build and non-deterministic across packer versions), and gitignore the *served* copy under `apps/web/public/<asset>/` (consumed by Vite / Fastify-static at runtime). `apps/web`'s `predev` and `prebuild` scripts run the packer then copy packed → served, so `npm run dev` and CI share one code path and neither has to remember the intermediate step. See `packages/content/scripts/pack-atlas.mjs` + `apps/web/scripts/prepare-assets.mjs` for the canonical example.
- **HUD styling uses CSS Modules.** React components that overlay the Phaser canvas (HUD, menus, tooltips) colocate a `*.module.css` file next to the component and import it as `styles`. Vite handles CSS Modules out of the box — no Tailwind or runtime CSS-in-JS. Top-level layout (`App.css`) stays as plain global CSS; component-scoped styles live in modules to prevent class-name collisions as the HUD grows. Tests identify components via `data-testid` rather than class names so CSS-Module hashing stays transparent.
- **HUD overlays stay click-through where empty.** Any React layer mounted over the Phaser canvas (HUD chrome, fog overlay, pause menu, tooltips) wraps its root in a container that owns positioning + the inherited `pointer-events: none`, with `> *` flipping `pointer-events: auto` on the actual interactive children. Pattern (see `apps/web/src/hud/Hud.module.css`): a `.game-stage` parent with `position: relative`, then `.hud { position: absolute; inset: 0; pointer-events: none }` and `.hud > * { pointer-events: auto }`. Without this, an absolutely-positioned overlay that covers the canvas eats every Phaser map click — ergonomically broken even when the overlay is mostly transparent. New overlay components must keep to this container pattern; tests should still locate elements via `data-testid` since the wrapper class is hashed by CSS Modules.
- **Top-level screen routing lives in the zustand store as a literal-union.** App-level navigation between `'menu' | 'faction-select' | 'game'` (and future stops: `'pause'`, `'colony'`, `'diplomacy'`, `'codex'`, `'prologue'`, `'game-over'`) is a single `screen` slice in `apps/web/src/store/game.ts` rather than a routing library. `App.tsx` is a switch-on-`screen` dispatcher. Tests set the screen state directly in `beforeEach` (`useGameStore.setState({ screen: 'game' })`) instead of simulating navigation events — the test surface stays small and resilient to UI re-shuffles. Reasons over react-router: no extra dep, Phaser's canvas state is independent of URL state anyway (deep-linking into mid-game is an explicit non-goal), and the menu-vs-game split needs its own conditional anyway since they share no chrome. New screens add a literal to the union + a case to `App.tsx` + a `setScreen('<new>')` call from the originating UI; tests must split into per-screen suites (one `beforeEach` per terminal `screen` value) to avoid mounting the wrong root component. **Two sub-shapes exist: *terminal* screens vs *overlay* screens.** Terminal screens (`'menu'`, `'faction-select'`, `'game'`, `'game-over'`, `'prologue'`) each render their own root component; switching between them unmounts the previous root, so Phaser state does not survive `'game' → 'menu'` without explicit save. *Overlay* screens (`'pause'` today; `'colony'`, `'diplomacy'`, `'codex'` on the roadmap) render *on top of* the `'game'` root while the Phaser `GameScene` stays mounted beneath — because the player expects Esc-then-resume to continue the same battle, not restart it, and because a destroyed Phaser game is expensive to reconstruct. Mechanics: `App.tsx` dispatches the game-stage components (`<GameCanvas />` + `<Hud />`) for every member of the overlay family *plus* `'game'`, then layers the overlay component conditionally (`screen === 'pause' && <PauseOverlay />`). Canonical example: `apps/web/src/pause/PauseOverlay.tsx` (TASK-016); the overlay emits the `'game:pause'` / `'game:resume'` bus events on mount/unmount so the Phaser scene is suspended without the React tree needing to know about the game instance. Tests for overlay screens therefore assert *both* the terminal-root presence AND the overlay layer (see `App.test.tsx` pause suite asserting `getByTestId('hud')` + `getByTestId('pause-overlay')` co-mount). New overlay screens follow the same shape: add the literal, add the `App.tsx` dispatcher entry to the overlay family, mount-emit the pause bus event pair on overlay lifecycle.
- **Heraldic / crest visuals are inline SVG until the art epic ships.** Faction crests, OTK heraldry, and other emblematic chrome render as inline `<svg>` inside the React component during the pre-art-epic MVP — see `apps/web/src/menu/MainMenu.tsx` (paired-dragons motto) and `apps/web/src/menu/FactionSelect.tsx` (per-faction shield + sigil). Reasons: zero asset-pipeline pressure (no atlas regen, no preload phase, no Capacitor sync gymnastics), one PR per heraldic surface, and an obvious swap-point later when the pixel-art crests land — replace the `<svg>` body without touching the React tree. Constraints: scope every visual with a stable `data-testid` (e.g. `faction-crest-otk`) so tests pin structure-not-style and survive the future raster swap; mirror duplicates with `transform="scale(-1 1)"` rather than copy-pasting paths; any SVG that would push a single-component file past ~150 lines moves into a sibling `*.svg.tsx` partial. Inline SVG is not the long-term answer for the in-game tile atlas (which goes through the source/packed/served pipeline) — it's specifically for menu/HUD heraldic chrome.
- **`exactOptionalPropertyTypes: true` — optional fields do not accept `undefined`.** `tsconfig.base.json` enables this flag alongside the rest of `strict`, so a type declared as `{ foo?: T }` *rejects* `{ foo: undefined }`: the absence of the property and its presence with an `undefined` value are distinct types. The trap is threading an optional through a spread (`{ ...base, foo: maybeUndef }`) or through a `Partial<T>` that got narrowed to `T | undefined`. Fix with conditional spread, never with a non-null assertion or `as any`: `const out = maybeUndef !== undefined ? { ...base, foo: maybeUndef } : base`. Canonical example: `apps/web/src/game/create-game.ts` `startGameScene` (TASK-022) conditionally attaches `cameraFocus` and `visibility` only when defined. The flag catches real save-format bugs — an older save might return `undefined` for a field a newer reader treats as required — so every occurrence is a branch worth writing, not a suppression worth adding. Same flag also forces `array[i]!` at the post-validation copy site inside `fromJSON` revivers (`noUnusedLocals` + `exactOptionalPropertyTypes` interact here — see TASK-017 `GameMap.fromJSON`): keep the validation loop and the copy loop separate so the error message pins the offending index, rather than fusing them to avoid the assertion.
- **Consume save-format const-object unions via an exhaustive `switch` with no `default` case.** Functions whose behaviour branches on every member of a save-format union (per-tile cost, per-resource yield, per-building upkeep, per-profession output, per-unit combat stats) should be written as a `switch (kind) { case TileType.Ocean: …; case TileType.Island: …; … }` with *no* `default`. TypeScript's exhaustiveness check then catches a missing case at compile time the moment a new literal is added to the const object — every consumer that needs updating surfaces as a red squiggle at build, not as an `unknown TileType` throw at runtime. Canonical example: `tileCost(type, flags)` in `packages/core/src/map/pathfind.ts` (TASK-028) switches over `TileType` to pick per-tile A* step cost; adding a new tile kind fails the build until every consumer picks a cost. This bullet is the *reader* half of the string-literal const-object rule above (which is the *writer* half). Prefer `switch` over a `Record<TKind, T>` table when per-case branches contain non-trivial logic (flag lookups, conditional `Infinity`, cross-references into other kinds); use the table shape only when branches are single-expression and live right next to the definition. Never paper over the compile error with `default: throw` — suppression turns the build-time tripwire into a runtime crash with no caller-site pin.
- **Rule-relevant stats live in `@colonize/core`; descriptive / flavour stats live in `@colonize/content`.** A numeric attribute that the engine *reads to resolve a rule* (movement points, hull HP, upkeep cost, resource yield, combat stats) belongs next to its registry in `packages/core` — that's what `Unit.resetMovement()` reads out of `getUnitTypeDefinition(…).baseMovement` in TASK-026. A descriptive attribute (display name, tooltip copy, lore description, UI icon hint) belongs in `packages/content`. The canonical split is TASK-027's ship registry: `baseMovement` lives in `packages/core/src/unit/unit-type.ts` *and* on `ShipClassEntry` in `packages/content/src/units.ts`, because a single tooltip read wants the full stat block. Prefer the duplicated number over a `content → core` import: the dependency-direction rule (`web/mobile/server → core/shared/content`, never the other way) forbids content importing core, and a new cross-workspace edge to save two lines loses against the Tier 1 "don't design for hypothetical future requirements" rule. When duplicating, pin consistency with a test in the content workspace that asserts the internal ordering invariant (sloop/privateer fastest `baseMovement`, ship-of-the-line slowest; hull ascending sloop → ship-of-the-line) so drift between the two copies fails loudly in CI. Future stats likely to follow this split: resource base yields, building upkeep, profession output multipliers, combat attack/defense, ship cargo capacity.
- **Ship the entity's primitive; leave iteration / scheduling to the task that owns the collection.** When a class exposes an action that a higher-level system will eventually drive (per-turn hooks, per-faction iteration, event dispatch), scope the implementing task to *just the primitive* and leave the wiring for the task that introduces the collection. Canonical examples: TASK-024's `TurnManager` exposes `on/off` hooks but deliberately does *not* serialize them — reloaded game state carries phase/turn only, and the loading code re-attaches hooks from whatever subsystem owns each one. TASK-026's `Unit` exposes `resetMovement()` as a primitive but does NOT register a `TurnManager` Start-enter hook that iterates all units; the roster task (not yet on the board) will own that iteration so it can pick per-faction vs global, eager vs lazy, with or without a skip-blocked filter. Reason: wiring decisions depend on context — roster shape, faction-turn interleaving, world-event ordering — that the primitive's scoped task doesn't have and shouldn't guess. Forcing a wiring choice now either couples the primitive to whichever collection is convenient today (triggering a refactor once the real collection arrives) or bakes in a default (auto-reset-all-units-on-Start) the orchestration task may need to opt out of. The seam is deliberate: "I do this thing" belongs with the entity, "when / to whom this thing happens" belongs with the orchestrator. Applies broadly to core primitives — unit actions, tile effects, combat modifiers, resource producers: publish the verb in the entity module and stop before binding it to a scheduler or iterator.
- **Opaque string aliases bridge pre-registry save-format identifiers.** When a save-format-bound identifier doesn't yet have a const-object registry (because the registry task hasn't landed), expose it as a plain `export type FooId = string` alias rather than inventing a temporary const-object or importing one from `@colonize/content`. Mutators validate non-empty (`assertNonEmptyString(op, label, value): asserts value is FooId`-style) at the primitive boundary so untrusted JSON input fails at the call site, not at the first downstream consumer. The wire format round-trips the kebab-case string as-is, so tightening to a proper union later (when the registry task finally lands) is a one-line change to the alias that leaves every call-site valid. Canonical examples: `ResourceId` / `ArtifactId` in `packages/core/src/cargo/cargo-hold.ts` (TASK-034 — registry lands in TASK-044 `ResourceType`), `CrewId` / `BuildingId` in `packages/core/src/colony/colony.ts` (TASK-038 — registries land later in EPIC-06 profession / building tasks). Reasons over the const-object-now shape: (a) inventing a placeholder registry forces the upcoming registry task to reshuffle every identifier it picks, (b) importing from `@colonize/content` is forbidden by the dependency-direction rule (`web/mobile/server → core/shared/content`, never the other way — `packages/core` in particular can't reach content at all), and (c) the string alias is already stable at the wire level so the registry upgrade is a type-narrowing, not a value migration. This is the "registry-not-ready-yet" corner case of the string-literal const-object rule above — same writer contract, deferred tightening.
- **Map/Set-backed save-format emitters sort entries in `toJSON` for byte-parity determinism.** Any primitive whose internal state uses `Map` or `Set` and whose JSON emission is part of the save format must emit entries in a stable sorted order (alphabetical for string keys, row-major index order for coordinate keys, insertion-order-of-sorted-list for array snapshots). Without the sort, two instances that received the same mutations in a different order produce different JSON — breaking save-file replay parity across runs, machines, and cross-version reloads even though the two instances are logically equal. JS `Set` and `Map` preserve insertion order, and that insertion order leaks straight into a naive `JSON.stringify`. Canonical examples: `CargoHold.toJSON()` in `packages/core/src/cargo/cargo-hold.ts` sorts resource ids alphabetically and artifact ids alphabetically (TASK-034); `FactionVisibility.toJSON()` emits cells in row-major index order; `DirectionLayer.toJSON()` emits sparse entries sorted by row-major index (TASK-029); `Colony.toJSON()` in `packages/core/src/colony/colony.ts` sorts the crew + building id snapshots alphabetically (TASK-038). The sort is cheap (small-N, short kebab-case strings) and the determinism guard is a one-liner test: two differently-ordered mutation sequences that end in the same logical state must produce identical `JSON.stringify(x.toJSON())`. Applies to every future save-format primitive that backs its state with a `Set` or `Map` — ResourceStockpile, FactionRegister, ReputationLedger, etc. — write the determinism test alongside the primitive's `toJSON`, not as a follow-up when a cross-machine replay diverges.
- **Scalar seams for pre-registry axis values.** When a primitive's rule involves a numeric axis whose authoritative value will be supplied by a registry that hasn't yet landed (profession-yield multipliers, reputation modifiers, weather deltas, combat damage factors, event-trigger probabilities), accept the scalar as a function argument on the primitive rather than looking it up internally. Pair it with an edge-validation guard (positive finite, integer, non-negative, etc.) so the primitive's output is always a clean value ready to merge into the caller's state. Once the registry lands, the wrapper module owned by that registry (profession-table, reputation-ledger, weather-model, combat-resolver) reads the registry and supplies the scalar — the primitive's signature never changes. Canonical examples: `scaleTileYield(base, multiplier)` in `packages/core/src/map/tile-yield.ts` (TASK-042 — awaiting TASK-045's profession-multiplier wrapper); `buildingEffort = sum(def.cost values)` + `colonyProductionValue = max(1, population)` in `apps/web/src/colony/build-queue.ts` (TASK-041 — both are caller-supplied proxies until real production stats + profession bonuses land). Reasons over inventing an internal lookup: (a) a placeholder registry inside the primitive forces the eventual registry task to reshuffle every value it picks; (b) parametrising the seam keeps the primitive's signature stable across the registry upgrade (zero save-format migration, zero call-site churn — the orchestrator switches from a literal `1` to a profession-table read without touching the primitive); (c) edge validation on the scalar catches corruption symmetrically with the identifier-validation rule on `ResourceId` / `BuildingId`. This is the *numeric-axis* half of the opaque-string-alias rule — same deferred-tightening shape applied to scalars instead of identifiers. Does not apply when the scalar is a constant the primitive owns outright (`MIN_SAILING_STEP_COST`, `MIN_MAP_WIDTH`, `MAX_FACTION_COUNT`) — only when another registry is the eventual source of truth.
- **Trim consumer-specific fields off save-format registries.** When a task description enumerates a registry field whose semantic meaning lives in a consumer system that doesn't yet exist (a building's gameplay `effect` string, a blueprint's `unlocked` flag, a tile's descriptive subtype used only by a single future yield-system), drop the field rather than invent a placeholder. The consumer system when it lands reads the registry id through its own lookup (`hasBuilding(BuildingType.Shipyard)`, `legendaryFleet.isBuildable(id)`, `getTileYield(TileType.Island)`) and applies its own semantics — no encoded hook on the registry struct is required for consumers to attach behaviour. Canonical examples: `BuildingDefinition` in `packages/core/src/building/building-type.ts` deliberately omitted `effect: string` even though TASK-040's description mentioned "Shipyard enables ship construction" / "Chapel grants Talisman blessings" — the shipyard construction flow and the rumour-blessing system each query `hasBuilding(type)` through their own entry point (TASK-040). `LegendaryShipSlot` dropped the static `unlocked: false` field even though an earlier draft carried it — per-faction runtime state owned by `LegendaryFleet.discovered` / `redeemed` sets is the real source of truth (TASK-035). `TileType` was NOT expanded to add `fishing-waters` / `kelp-forest` / `coastal-grove` members even though TASK-042's description used those names — those tile-kind descriptors were interpreted as subtypes of the existing coarse `Ocean` / `Island` members, with the yield vector in `getTileYield` doing the per-kind work any consumer needed (TASK-042). Reasons over adding the speculative field: (a) it becomes either dead flavour duplicating `summary` / `description` or a poorly-typed union trying to encode every consumer's entry point before any consumer exists; (b) every new save-format member forces a migration for every wire-format change the consumer later wants, so adding one speculatively pays the migration cost twice; (c) the consumer's semantics belong with the consumer, where the change cadence is local. Distinct from "Ship the entity's primitive; leave iteration / scheduling to the task that owns the collection" (which governs *when / to whom* a verb fires) — this is about *which fields live on the registry's struct* versus *which fields live on the consumer's own state*.

---

## Autonomous workflow

This project uses an autonomous development agent running on a VPS
(`srv1604573.hstgr.cloud`). Key facts:

- Tasks live in `roadmap/roadmap.yml`. Render with `node roadmap/render.mjs`.
- Branches follow `auto/<TASK-ID>-<slug>`.
- Roadmap status changes travel through the PR (branch-as-payload) — never committed directly to main.
- CI required checks: `ci` (typecheck + lint + format:check + test + build).
- Auto-merge enabled on main; branch protection requires `ci`.
- VPS auto-deploy enabled on every merge to main (rolling, with auto-rollback on healthcheck fail).
- Cadence: `claude-colonize.timer` systemd unit fires `claude-colonize.service` oneshot hourly. Stop with `systemctl stop claude-colonize.timer`.
- Remote Control: persistent `claude-rc.service` keeps mobile/web push notifications routable.

### Self-improvement — fully autonomous, PR-driven

Every `successThreshold` consecutive successful runs, `/autonomous-review`
drafts refinements anywhere in the repo (except CLAUDE.md Tier 1) as
commits on a dedicated `auto/review-<date>` branch, opens a PR, and
enables auto-merge. **No human approval gate** — the PR + commit history
IS the audit trail.

Override mechanisms (all standard git/gh):
- Block a review PR before merge: `gh pr close <num>`
- Revert a merged review: `gh pr revert <num>` (opens a revert PR)
- Record a rejection to prevent re-proposal: append to `.claude/approvals/history.md`
- Stop the agent entirely: `systemctl stop claude-colonize.timer`
- See `/autonomous-approve` (now a revert helper) for guided commands

### Notifications

Every `/autonomous-run` cycle ends by running `scripts/notify-cycle.sh`
(wired as Stage 2 in `claude-colonize.service`). It parses the last
AGENT-LOG entry and pushes a summary to **ntfy.sh** using `NTFY_TOPIC`
from `.env`. Delivery is independent of any Claude.ai "user active"
guard — reaches your phone even while you're using Claude Code
interactively elsewhere.

Subscribe by opening the ntfy mobile app (iOS / Android / web
[ntfy.sh](https://ntfy.sh)) and adding the topic URL from `.env`.

Failures are non-fatal — the source of truth remains `AGENT-LOG.md` and
PRs on GitHub.

See `docs/RUNBOOK.md` for troubleshooting and `docs/ARCHITECTURE.md` for deeper context on why the workflow is shaped this way.
