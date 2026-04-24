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
- Detailed jsdom + pure-sibling rules for Phaser code live in `@.claude/notes/phaser-patterns.md`.
- Detailed pure-sibling rules for React component logic live in `@.claude/notes/ui-screens.md`.
- Registry-test relational-invariants rule lives in `@.claude/notes/registry-patterns.md`.

## Scaffolding hygiene

- **Gitignore new tooling artefacts in the same PR that introduces the tool.** When scaffolding a new dependency, audit what the tool writes to disk on first use (`*.tsbuildinfo` for `tsc -b`, `ios/App/App/public/` and `capacitor.config.json` copies for `npx cap sync`, `build/`/`.gradle/`/`DerivedData/`/`Pods/` for native mobile builds, etc.) and add them to `.gitignore` before opening the PR. This avoids per-task follow-up commits cleaning up leaked artefacts.

## Architecture notes

Topline architecture principles — cross-cutting rules that govern package
boundaries and seam design. Detailed pattern rules for specific subsystems
live in `.claude/notes/*.md` imports below.

- **Pure core, impure shells.** `packages/core` is framework-free TS — it must run in Node (for server simulation + tests) and browser (for client). No `window`, no Phaser imports, no React.
- **Server API contract.** Every endpoint's request + response schema lives in `packages/shared`. Client and server both import from there; mismatches become typecheck errors.
- **Mobile wrapper.** `apps/mobile` is a Capacitor wrapper around `apps/web`'s build output. Never duplicate web UI code — all shared UI lives in `apps/web`.
- **Generated asset pipelines use the source/packed/served triad.** Commit the *source* inputs under `packages/content/<asset>-src/<name>/` (CI-deterministic); gitignore the *packed* output under `packages/content/<asset>-out/` (regenerated per build); gitignore the *served* copy under `apps/web/public/<asset>/` (consumed at runtime). `apps/web`'s `predev` and `prebuild` scripts run the packer then copy packed → served. See `packages/content/scripts/pack-atlas.mjs` + `apps/web/scripts/prepare-assets.mjs`.
- **Ship the entity's primitive; leave iteration / scheduling to the task that owns the collection.** When a class exposes an action that a higher-level system will eventually drive (per-turn hooks, per-faction iteration, event dispatch), scope the implementing task to *just the primitive* — "I do this thing" belongs with the entity, "when / to whom this thing happens" belongs with the orchestrator. Applies broadly to core primitives: unit actions, tile effects, combat modifiers, resource producers.
- **Slice-driven self-mounting overlay — canonical-examples refresh (2026-04).** `@.claude/notes/ui-screens.md` documents the "nullable store slice + unconditional `<Component />` in `App.tsx`'s game-stage block + `if (!slice) return null` guard" pattern with its two originating examples (`CombatOverlay` in TASK-055, `RumourRevealModal`). The MVP has since applied the same rule five more times: `apps/web/src/blackmarket/BlackMarketModal.tsx` gated on `blackMarketEncounter` (TASK-062), `apps/web/src/hud/TithePaymentModal.tsx` on `titheNotification` (TASK-068), `apps/web/src/hud/TidewaterPartyModal.tsx` on `tidewaterPartyEvent` (TASK-069), `apps/web/src/sovereignty/SovereigntyBeatModal.tsx` on `sovereigntyBeat` (TASK-071), `apps/web/src/tavern/TavernModal.tsx` on `tavernEncounter` (TASK-075). When adding the seventh+ transient-event modal, mirror the existing shape (nullable slice, show/dismiss actions, unconditional mount, internal-null guard, slice-setState tests rather than `screen`-driven tests) rather than re-deriving from the two original examples — seven applications make this a load-bearing pattern, not a two-off. Best-effort home for this list is the notes file, but Edit-on-`.claude/notes/*.md` remains blocked at the Claude Code CLI as of 2026-04-24; bullet landed here as fallback.

### Subsystem pattern notes (imported)

- TS / save-format kinds, exhaustive switches, opaque-string aliases, scalar seams, `exactOptionalPropertyTypes` traps — `@.claude/notes/typescript-patterns.md`
- Save-format machinery (`toJSON` determinism, FIFO + re-fire-guard accumulators, defensive-copy getters) — `@.claude/notes/serialization-patterns.md`
- Registry design (core-vs-content split, trim speculative fields, relational-invariant tests) — `@.claude/notes/registry-patterns.md`
- Zustand store discipline (atomic multi-slice `set`, clamp-at-boundary) — `@.claude/notes/zustand-patterns.md`
- Phaser + jsdom (React/Phaser isolation via bus, pure-sibling modules, canvas stubs) — `@.claude/notes/phaser-patterns.md`
- React UI / screens (CSS Modules, click-through overlays, terminal-vs-overlay taxonomy, slice-driven event modals, heraldic inline SVG, pure-sibling for component logic) — `@.claude/notes/ui-screens.md`

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
