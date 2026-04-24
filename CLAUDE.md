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
- Subsystem-specific testing patterns (pure-sibling modules for Phaser, pure-sibling for React component logic, relational-invariants for balance-tunable registry tests) live in the nested CLAUDE.md for each subsystem — see the subsystem index below.

## Scaffolding hygiene

- **Gitignore new tooling artefacts in the same PR that introduces the tool.** When scaffolding a new dependency, audit what the tool writes to disk on first use (`*.tsbuildinfo` for `tsc -b`, `ios/App/App/public/` and `capacitor.config.json` copies for `npx cap sync`, `build/`/`.gradle/`/`DerivedData/`/`Pods/` for native mobile builds, etc.) and add them to `.gitignore` before opening the PR. This avoids per-task follow-up commits cleaning up leaked artefacts.

## Architecture notes

Topline architecture principles — cross-cutting rules that govern package
boundaries and seam design. Detailed pattern rules for specific subsystems
live in nested `CLAUDE.md` files under each subsystem (see index below);
Claude Code loads a nested `CLAUDE.md` on demand when it reads a file in
or below that subsystem's directory.

- **Pure core, impure shells.** `packages/core` is framework-free TS — it must run in Node (for server simulation + tests) and browser (for client). No `window`, no Phaser imports, no React.
- **Server API contract.** Every endpoint's request + response schema lives in `packages/shared`. Client and server both import from there; mismatches become typecheck errors.
- **Mobile wrapper.** `apps/mobile` is a Capacitor wrapper around `apps/web`'s build output. Never duplicate web UI code — all shared UI lives in `apps/web`.
- **Generated asset pipelines use the source/packed/served triad.** Commit the *source* inputs under `packages/content/<asset>-src/<name>/` (CI-deterministic); gitignore the *packed* output under `packages/content/<asset>-out/` (regenerated per build); gitignore the *served* copy under `apps/web/public/<asset>/` (consumed at runtime). `apps/web`'s `predev` and `prebuild` scripts run the packer then copy packed → served. See `packages/content/scripts/pack-atlas.mjs` + `apps/web/scripts/prepare-assets.mjs`.
- **Ship the entity's primitive; leave iteration / scheduling to the task that owns the collection.** When a class exposes an action that a higher-level system will eventually drive (per-turn hooks, per-faction iteration, event dispatch), scope the implementing task to *just the primitive* — "I do this thing" belongs with the entity, "when / to whom this thing happens" belongs with the orchestrator. Applies broadly to core primitives: unit actions, tile effects, combat modifiers, resource producers.
- **Slice-driven self-mounting overlay — canonical-examples refresh (2026-04).** The "nullable store slice + unconditional `<Component />` in `App.tsx`'s game-stage block + `if (!slice) return null` guard" pattern (documented in `apps/web/src/CLAUDE.md`) has its two originating examples (`CombatOverlay` in TASK-055, `RumourRevealModal`). The MVP has since applied the same rule five more times: `apps/web/src/blackmarket/BlackMarketModal.tsx` gated on `blackMarketEncounter` (TASK-062), `apps/web/src/hud/TithePaymentModal.tsx` on `titheNotification` (TASK-068), `apps/web/src/hud/TidewaterPartyModal.tsx` on `tidewaterPartyEvent` (TASK-069), `apps/web/src/sovereignty/SovereigntyBeatModal.tsx` on `sovereigntyBeat` (TASK-071), `apps/web/src/tavern/TavernModal.tsx` on `tavernEncounter` (TASK-075). When adding the seventh+ transient-event modal, mirror the existing shape (nullable slice, show/dismiss actions, unconditional mount, internal-null guard, slice-setState tests rather than `screen`-driven tests) rather than re-deriving from the two original examples — seven applications make this a load-bearing pattern, not a two-off.
- **Balance-design targets for tunable registries live in `packages/content/balance.md`.** A balance pass against a tunable registry (campaign turn-counts, ship stats, profession multipliers, reputation thresholds, wave escalations, tension ladders) checks the numbers against the design envelopes recorded in `packages/content/balance.md` (introduced in TASK-073) before proposing a change. Complements the relational-invariant tests described in `packages/CLAUDE.md`: the tests enforce *relationships* between numbers (monotonicity, ordering, cross-tier escalation); `balance.md` documents the *intent* behind those relationships. A balance pass that leaves the literals unchanged after inspection is a legitimate outcome — the deliverable is the doc update if intent shifted, not a cosmetic re-tune (TASK-073 shipped as pure doc).

## TypeScript patterns

TS-specific rules applied broadly across `packages/core`, `packages/shared`,
and `apps/*`. These live in root `CLAUDE.md` rather than a nested file
because they apply to every `.ts` / `.tsx` surface in the repo.

- **String-literal const-objects for save-format-bound kinds.** Categorical types that round-trip through the save format (TileType, ResourceType, BuildingType, ProfessionType, UnitType, FactionId, etc.) are declared as a `const` object of string literals plus a derived type alias — see `packages/core/src/map/tile.ts` (`export const TileType = { Ocean: 'ocean', ... } as const; export type TileType = (typeof TileType)[keyof typeof TileType]`). Pair each with an `ALL_<KIND>S` readonly array and an `is<Kind>(value): value is <Kind>` narrowing guard so `fromJSON`-style revivers can validate untrusted input cell-by-cell. Avoid TypeScript `enum` (regular `enum` inflates the `@colonize/core` runtime surface with a redundant object since the type alias already gives us autocompletion + exhaustiveness; `const enum` is unsafe under `isolatedModules: true` and silently breaks across project-reference boundaries). The string values are the wire format — they appear verbatim in serialized save JSON, so pick stable kebab-case identifiers and never re-spell them; rename via a save-version migration, not a refactor.
- **Cross-workspace TS imports** resolve via the `node_modules/@colonize/*` symlinks created by npm workspaces; the importing workspace also adds a `references: [{ "path": "../../packages/<dep>" }]` entry to its `tsconfig.json` so `tsc -b` builds dependencies in the right order. No `paths` aliases are needed in tsconfig or `vite.config.ts`. Run `npm install` at the repo root after adding any new workspace `package.json` so the symlinks materialise before `--workspace=…` commands run.
- **`exactOptionalPropertyTypes: true` — optional fields do not accept `undefined`.** `tsconfig.base.json` enables this flag alongside the rest of `strict`, so a type declared as `{ foo?: T }` *rejects* `{ foo: undefined }`: the absence of the property and its presence with an `undefined` value are distinct types. The trap is threading an optional through a spread (`{ ...base, foo: maybeUndef }`) or through a `Partial<T>` that got narrowed to `T | undefined`. Fix with conditional spread, never with a non-null assertion or `as any`: `const out = maybeUndef !== undefined ? { ...base, foo: maybeUndef } : base`. Canonical example: `apps/web/src/game/create-game.ts` `startGameScene` (TASK-022) conditionally attaches `cameraFocus` and `visibility` only when defined. The flag catches real save-format bugs — an older save might return `undefined` for a field a newer reader treats as required — so every occurrence is a branch worth writing, not a suppression worth adding. Same flag also forces `array[i]!` at the post-validation copy site inside `fromJSON` revivers (`noUnusedLocals` + `exactOptionalPropertyTypes` interact here — see TASK-017 `GameMap.fromJSON`): keep the validation loop and the copy loop separate so the error message pins the offending index, rather than fusing them to avoid the assertion.
- **Consume save-format const-object unions via an exhaustive `switch` with no `default` case.** Functions whose behaviour branches on every member of a save-format union (per-tile cost, per-resource yield, per-building upkeep, per-profession output, per-unit combat stats) should be written as a `switch (kind) { case TileType.Ocean: …; case TileType.Island: …; … }` with *no* `default`. TypeScript's exhaustiveness check then catches a missing case at compile time the moment a new literal is added to the const object — every consumer that needs updating surfaces as a red squiggle at build, not as an `unknown TileType` throw at runtime. Canonical example: `tileCost(type, flags)` in `packages/core/src/map/pathfind.ts` (TASK-028) switches over `TileType` to pick per-tile A* step cost; adding a new tile kind fails the build until every consumer picks a cost. This bullet is the *reader* half of the string-literal const-object rule above (which is the *writer* half). Prefer `switch` over a `Record<TKind, T>` table when per-case branches contain non-trivial logic (flag lookups, conditional `Infinity`, cross-references into other kinds); use the table shape only when branches are single-expression and live right next to the definition. Never paper over the compile error with `default: throw` — suppression turns the build-time tripwire into a runtime crash with no caller-site pin.
- **Opaque string aliases bridge pre-registry save-format identifiers.** When a save-format-bound identifier doesn't yet have a const-object registry (because the registry task hasn't landed), expose it as a plain `export type FooId = string` alias rather than inventing a temporary const-object or importing one from `@colonize/content`. Mutators validate non-empty (`assertNonEmptyString(op, label, value): asserts value is FooId`-style) at the primitive boundary so untrusted JSON input fails at the call site, not at the first downstream consumer. The wire format round-trips the kebab-case string as-is, so tightening to a proper union later (when the registry task finally lands) is a one-line change to the alias that leaves every call-site valid. Canonical examples: `ResourceId` / `ArtifactId` in `packages/core/src/cargo/cargo-hold.ts` (TASK-034 — registry lands in TASK-044 `ResourceType`), `CrewId` / `BuildingId` in `packages/core/src/colony/colony.ts` (TASK-038 — registries land later in EPIC-06 profession / building tasks). Reasons over the const-object-now shape: (a) inventing a placeholder registry forces the upcoming registry task to reshuffle every identifier it picks, (b) importing from `@colonize/content` is forbidden by the dependency-direction rule (`web/mobile/server → core/shared/content`, never the other way — `packages/core` in particular can't reach content at all), and (c) the string alias is already stable at the wire level so the registry upgrade is a type-narrowing, not a value migration. This is the "registry-not-ready-yet" corner case of the string-literal const-object rule above — same writer contract, deferred tightening.
- **Scalar seams for pre-registry axis values.** When a primitive's rule involves a numeric axis whose authoritative value will be supplied by a registry that hasn't yet landed (profession-yield multipliers, reputation modifiers, weather deltas, combat damage factors, event-trigger probabilities), accept the scalar as a function argument on the primitive rather than looking it up internally. Pair it with an edge-validation guard (positive finite, integer, non-negative, etc.) so the primitive's output is always a clean value ready to merge into the caller's state. Once the registry lands, the wrapper module owned by that registry (profession-table, reputation-ledger, weather-model, combat-resolver) reads the registry and supplies the scalar — the primitive's signature never changes. Canonical examples: `scaleTileYield(base, multiplier)` in `packages/core/src/map/tile-yield.ts` (TASK-042 — awaiting TASK-045's profession-multiplier wrapper); `buildingEffort = sum(def.cost values)` + `colonyProductionValue = max(1, population)` in `apps/web/src/colony/build-queue.ts` (TASK-041 — both are caller-supplied proxies until real production stats + profession bonuses land). Reasons over inventing an internal lookup: (a) a placeholder registry inside the primitive forces the eventual registry task to reshuffle every value it picks; (b) parametrising the seam keeps the primitive's signature stable across the registry upgrade (zero save-format migration, zero call-site churn — the orchestrator switches from a literal `1` to a profession-table read without touching the primitive); (c) edge validation on the scalar catches corruption symmetrically with the identifier-validation rule on `ResourceId` / `BuildingId`. This is the *numeric-axis* half of the opaque-string-alias rule — same deferred-tightening shape applied to scalars instead of identifiers. Does not apply when the scalar is a constant the primitive owns outright (`MIN_SAILING_STEP_COST`, `MIN_MAP_WIDTH`, `MAX_FACTION_COUNT`) — only when another registry is the eventual source of truth.

### Subsystem pattern files (nested CLAUDE.md)

Each file loads on demand when Claude reads a file in or below its directory.

- `packages/CLAUDE.md` — registry design (core-vs-content split, trim speculative fields, relational-invariant tests) + save-format serialisation (`toJSON` determinism, FIFO + re-fire-guard accumulators, defensive-copy getters).
- `apps/web/src/CLAUDE.md` — Zustand store discipline (atomic multi-slice `set`, clamp-at-boundary) + React UI / screens (CSS Modules, click-through overlays, terminal-vs-overlay taxonomy, slice-driven event modals, heraldic inline SVG, pure-sibling for component logic).
- `apps/web/src/game/CLAUDE.md` — Phaser + jsdom (React/Phaser isolation via bus, pure-sibling modules, canvas stubs).

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
