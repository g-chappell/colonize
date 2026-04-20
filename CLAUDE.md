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

## Architecture notes

- **Pure core, impure shells.** `packages/core` is framework-free TS — it must run in Node (for server simulation + tests) and browser (for client). No `window`, no Phaser imports, no React.
- **Rendering split:** React owns DOM chrome (menus, tooltips, HUD), Phaser owns the game canvas. They communicate via a shared event bus in `apps/web/src/bus.ts` (to be created in EPIC-02).
- **Server API contract:** every endpoint's request + response schema lives in `packages/shared`. Client and server both import from there; mismatches become typecheck errors.
- **Save format:** `packages/core` exports `serialize/deserialize` for game state. Same format used for local save and cloud save. Version with an integer; add migrations in `packages/core/migrations/`.
- **Mobile:** `apps/mobile` is a Capacitor wrapper around `apps/web`'s build output. Never duplicate web UI code — all shared UI lives in `apps/web`.

---

## Autonomous workflow

This project uses an autonomous development agent. Key facts:

- Tasks live in `roadmap/roadmap.yml`. Render with `node roadmap/render.mjs`.
- Branches follow `auto/<TASK-ID>-<slug>`.
- Roadmap status changes travel through the PR (branch-as-payload) — never committed directly to main.
- Every 5 consecutive successful tasks, the agent proposes CLAUDE.md refinements. Review via `/autonomous-approve`.
- CI required checks: `ci` (typecheck + lint + test + build). Optional: `e2e`.
- Auto-merge enabled on main; branch protection requires `ci`.
- VPS auto-deploy enabled on every merge to main (rolling, with auto-rollback on healthcheck fail).

See `docs/RUNBOOK.md` for troubleshooting and `docs/ARCHITECTURE.md` for deeper context on why the workflow is shaped this way.
