# Agent Log

Append-only run log for the autonomous dev agent. Every run writes one entry
here, regardless of outcome. Review cycles write a separate `REVIEW-LOG.md`
entry AND flag this entry with `review_proposed: true` — so the log never has
gaps.

## Format

```
---

### Run [YYYY-MM-DD HH:MM]
- Task: TASK-XXX — <title> (or "N/A — no tasks available")
- Outcome: success | blocked | skipped | success_with_warning
- PR: <URL or N/A>
- Test counts: <workspace counts>
- Files changed: <list>
- Regression alert: true | false
- Review proposed: true | false
- Deploy: success | failed | n/a
- Lessons learned: <free text>
- Notes: <optional>
```

---

## Run History

---

### Run [2026-04-20 18:30]
- Task: TASK-001 — Scaffold root TS tooling (tsconfig.base, ESLint, Prettier)
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/2 (merged)
- Test counts: no workspaces yet — skipped cleanly
- Files changed: tsconfig.base.json, eslint.config.js, .prettierrc.json, .prettierignore, scripts/run-workspaces.mjs, package.json, package-lock.json, .github/workflows/ci.yml, .claude/project.json, docker/docker-compose.yml
- Regression alert: false
- Review proposed: false (1 success in streak; threshold = 5)
- Deploy: pending (deploy.autoDeployOnMerge = true but first deploy will still fail until EPIC-01 produces an apps/server build; the Dockerfile COPY targets are empty)
- Lessons learned:
  - Original task description said "root tsconfig.json with project references" — empty `references:[]` triggers TS18002. Solution-style root tsconfig deferred until at least one workspace has TS code. Roadmap tasks in the bootstrap tier should anticipate this.
  - `npm run <cmd> --workspaces --if-present` errors with "No workspaces found!" when the glob is empty — `--if-present` doesn't help here. Wrapped with `scripts/run-workspaces.mjs` for graceful no-op.
  - CI previously used skip-if-missing guards to handle the pre-scaffold state; now unified through npm scripts → simpler CI, same behaviour.
- Notes: First autonomous-run cycle on this project. Kicked off manually as a dry-run by /init-autonomous Phase 8; next fire is the systemd timer at top-of-hour.

---

### Run [2026-04-20 18:42]
- Task: TASK-002 — Scaffold apps/web with Vite + React + TS
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/3 (merged)
- Test counts: web=3 (new baseline)
- Files changed: apps/web/* (11 files), package-lock.json, .gitignore
- Regression alert: false (no previous web baseline)
- Review proposed: false (2 consecutive successes; threshold = 5)
- Deploy: deferred (CI green, but apps/server still missing — Dockerfile COPY will fail until TASK-006 lands)
- Lessons learned:
  - `tsconfig.tsbuildinfo` is a TS incremental-build artifact that leaks into commits unless gitignored. Added `*.tsbuildinfo` to .gitignore in a follow-up commit on the same branch.
  - First workspace landing validated the `scripts/run-workspaces.mjs` guard from TASK-001 — works as intended: runs workspace typecheck/test/build only once at least one workspace exists.
  - Theming uses placeholder 3-colour palette; proper OTK palette + retro pixel-art pipeline lands in EPIC-02.
- Notes: Second autonomous-run cycle, manually fired at user request (question c).

---

### Run [2026-04-20 19:00]
- Task: TASK-003 — Scaffold apps/mobile with Capacitor + add iOS/Android
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/4 (merged)
- Test counts: web=3 (unchanged)
- Files changed: apps/mobile/* (~70 files across ios/ and android/ scaffolds), .gitignore, package.json, package-lock.json
- Regression alert: false
- Review proposed: false (3 consecutive successes; threshold = 5)
- Deploy: deferred (apps/server still missing; Dockerfile COPY will fail until TASK-006 lands)
- Lessons learned:
  - Capacitor `cap add ios` + `cap add android` work fine on Linux for scaffolding — only warnings are "pod install" and "xcodebuild" skipped (macOS-only, expected).
  - Need to gitignore `{ios,android}/.../public/` and `capacitor.config.json` copies (regenerated on every `cap sync` — shouldn't live in git).
  - Also gitignored native build outputs: `build/`, `.gradle/`, `DerivedData/`, `Pods/`, `local.properties`.
  - Repo-level `deleteBranchOnMerge` setting is required for automatic remote branch deletion on squash-merge; `--delete-branch` on `gh pr merge --auto` alone is unreliable. Fixed in a manual step before this run.
  - Local branches from squash-merged PRs need `[gone]` upstream detection to clean up (not `git branch --merged main`, which doesn't see squashed branches). Candidate refinement for /autonomous-run Step 3 via /autonomous-review.
- Notes: Third autonomous-run cycle. Branch cleanup verified working end-to-end this time.

---

### Run [2026-04-20 19:35]
- Task: TASK-004 — Scaffold packages/core, packages/shared, packages/content
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/6 (auto-merge enabled)
- Test counts: web=3 (unchanged), core=1 (new baseline), shared=2 (new baseline), content=2 (new baseline)
- Files changed: packages/core/* (4), packages/shared/* (4), packages/content/* (4), tsconfig.json, package-lock.json
- Regression alert: false
- Review proposed: false (4 consecutive successes; threshold = 5 — next success triggers /autonomous-review)
- Deploy: deferred (apps/server still missing; Dockerfile COPY will fail until TASK-006 lands)
- Lessons learned:
  - Root tsconfig.json with `"files": []` + `references: [...]` is the correct shape now that workspaces have composite TS — resolves the TS18002-style problem flagged at TASK-001 by simply waiting until at least one referenced package exists.
  - `npm install` at root is required after adding new workspace package.jsons before the symlinks under `node_modules/@colonize/*` are created — without it `--workspace=@colonize/shared` warns "no workspace folder present".
  - Prettier-formatted package.json is the canonical form: arrays expanded one-per-line. Adding a `package.json` template to `/autonomous-run` would dodge the format:check round-trip step.
- Notes: Fourth autonomous-run cycle. Streak is one short of `successThreshold` — TASK-005 (next likely pickup, depends on TASK-002 + TASK-004) will trigger the first /autonomous-review pass.

---

### Run [2026-04-20 20:10]
- Task: TASK-005 — Wire shared state store (Zustand) in apps/web
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/7 (auto-merge enabled)
- Test counts: web=8 (was 3 — added 5 in src/store/game.test.ts), core=1, shared=2, content=2
- Files changed: apps/web/package.json, apps/web/tsconfig.json, apps/web/src/store/game.ts, apps/web/src/store/game.test.ts, package-lock.json, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web went 3 → 8, all other counts steady)
- Review proposed: true (5 consecutive successes hits threshold; first /autonomous-review pass invoked)
- Deploy: build_failed (exit 1) — `bash scripts/deploy.sh` ran post-merge as configured (`autoDeployOnMerge: true`); Dockerfile `COPY apps/server/package.json` fails because apps/server has not been scaffolded yet. Pre-existing condition flagged in every prior run; nothing was deployed → no rollback required → other roadmap tasks remain pickupable. Resolves on TASK-006 (`Scaffold apps/server with Fastify + /health endpoint`).
- Lessons learned:
  - Cross-workspace import worked transparently via npm workspaces' `node_modules/@colonize/core` symlink + a tsconfig project reference from apps/web → packages/core. No path alias needed in vite.config / tsconfig paths.
  - Zustand v5 ships ESM-only, integrates cleanly with Vite + Vitest jsdom env. Stores reset via `useGameStore.getState().reset()` between tests with `beforeEach` is enough — no global teardown needed.
- Notes: Fifth autonomous-run cycle, first to cross the success-threshold. /autonomous-review fires next.

---

### Run [2026-04-20 20:40]
- Task: TASK-006 — Scaffold apps/server with Fastify + /health endpoint
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/10 (auto-merge enabled)
- Test counts: server=2 (new baseline), web=8, core=1, shared=2, content=2
- Files changed: apps/server/package.json, apps/server/tsconfig.json, apps/server/src/index.ts, apps/server/src/app.ts, apps/server/src/app.test.ts, tsconfig.json, package-lock.json, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (server is a new workspace; existing counts steady)
- Review proposed: false (streak resets to 1/5 after PR #8 self-improvement merge)
- Deploy: build_failed (exit 1) — new failure mode: `docker build` cannot reach the Docker daemon from the agent user (`permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`). The previous Dockerfile-COPY blocker IS resolved by this PR (apps/server now exists), but `colonize` (uid 999) is not in the `docker` group and `no_new_privileges` prevents sudo elevation. Operator action required on the VPS: `usermod -aG docker colonize && systemctl restart claude-colonize.service`. Not cascading — other roadmap tasks remain pickupable.
- Lessons learned:
  - Split the Fastify binary from the app factory (src/index.ts vs src/app.ts) so tests can `app.inject()` against the factory without ever binding a port — avoids flaky port-in-use failures and keeps tests hermetic.
  - @colonize/shared's HealthResponse Zod schema served as both response validator and test assertion shape — one source of truth for /health across server tests and future client consumers (PR #7 shared scaffold pays off here).
  - Prettier wants multi-line function-argument wrapping when the expression grows beyond the print-width; new server tests tripped format:check on the first pass. Could be caught upfront by running `prettier --write` on the changed files before the validation step.
- Notes: Sixth autonomous-run cycle. First success after the self-improvement review PR #8 / hotfix PR #9 — TASK-006 completes STORY-04's server entrypoint; TASK-007/TASK-008 (Fastify static + CI deploy workflow) now unblocked.

---

### Run [2026-04-20 21:30]
- Task: TASK-007 — Wire apps/server to serve apps/web static build
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/12 (auto-merge enabled)
- Test counts: server=8 (was 2 — added 6), web=8, core=1, shared=2, content=2
- Files changed: apps/server/package.json, apps/server/src/app.ts, apps/server/src/app.test.ts, apps/server/src/__fixtures__/web-dist/index.html, apps/server/src/__fixtures__/web-dist/assets/app.css, package-lock.json, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (server 2 → 8; all other counts steady)
- Review proposed: false (2 consecutive successes since the TASK-005 review checkpoint; threshold = 5)
- Deploy: success — image colonize:latest built, docker-app-1 up, healthcheck 200 on attempt 2 at http://localhost:3000/health. End-to-end verified on deployed app: GET / returns apps/web/dist/index.html (title "Colonize — NW 2191"), GET /some/spa/route falls back to index.html (SPA routing working in production), GET /favicon.svg serves directly as a static asset (200 + cache headers). Docker group perms unblocked since the TASK-006 failure (operator action implied). db container not spun up this deploy (likely pre-existing compose-ordering quirk when only app is needed for health gate) — not cascading.
- Lessons learned:
  - Opting into static serving via a `staticRoot` option (rather than checking `NODE_ENV` inline) kept the tests hermetic — fixture dir ships inside `apps/server/src/__fixtures__/` and only activates when the test passes the path. Keeps production auto-resolution (`apps/web/dist` relative to the compiled runtime file) separate from test concerns.
  - First cap-sync failure of the run was a stale EACCES on `android/capacitor-cordova-android-plugins/src/main/AndroidManifest.xml` that cleared on re-run. If this recurs across cycles, `/autonomous-review` should flag adding a `chmod -R u+w apps/mobile/android` pre-step or gitignore-audit — see similar refinement in PR #9's learning trail.
  - Prettier trips on bare `*.css` fixtures; running `prettier --write` on new content files before first validation pass saves a cycle (repeated lesson from TASK-006).
- Notes: Seventh autonomous-run cycle. Streak: 2 consecutive successes since the TASK-005 review checkpoint (TASK-006 → TASK-007); 3 more to re-hit successThreshold=5.

---

### Run [2026-04-20 22:05]
- Task: TASK-008 — Add GitHub Actions deploy workflow (main → VPS)
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/14 (auto-merge enabled)
- Test counts: server=8, web=8, core=1, shared=2, content=2 (all unchanged)
- Files changed: .github/workflows/deploy.yml (new), roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false
- Review proposed: false (3 consecutive successes since the TASK-005 review checkpoint; threshold = 5)
- Deploy: success (local /deploy path); new GH Actions workflow ran in parallel and failed on "missing server host" as expected (SSH_HOST / SSH_PRIVATE_KEY secrets not yet provisioned). Local deploy: colonize:latest rebuilt, docker-app-1 recreated, healthcheck 200 on attempt 2 at http://localhost:3000/health; GET returns {"ok":true,"version":"0.0.0","uptime":~4s}. GH Actions run: https://github.com/g-chappell/colonize/actions/runs/24693256793 (conclusion: failure at SSH step — operator action required to set secrets before this path becomes authoritative).
- Lessons learned:
  - `git reset --hard origin/main` in the remote deploy script is dangerous when the VPS checkout doubles as the autonomous agent's working directory (mid-feature-branch work would be wiped). Guarded by a current-branch check that bails if HEAD != main, and fast-forward-only pull. Safer default.
  - Two on-merge deploy actors now exist: (a) the systemd-timer agent running /autonomous-run step 12 on the VPS, (b) this new GH Actions workflow. `concurrency: deploy-production` serialises within Actions but the local-on-VPS run is a separate actor. Pick a winner in a follow-up; both race inside `docker compose build`.
- Notes: Eighth autonomous-run cycle. Infra-only change (no workspace code touched). Streak: 3 consecutive successes since the TASK-005 review checkpoint; 2 more to re-hit successThreshold=5.

---

### Run [2026-04-20 23:10]
- Task: TASK-009 — Define OTK retro palette + pipeline script
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/15 (merged)
- Test counts: server=8, web=8, content=9 (was 2 — added 7 palette tests), core=1, shared=2
- Files changed: packages/content/src/palette.ts, packages/content/src/palette.test.ts, packages/content/src/index.ts, packages/content/scripts/pack-atlas.mjs, packages/content/README.md, packages/content/package.json, package-lock.json, .gitignore, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (content 2 → 9; all other counts steady)
- Review proposed: false (4 consecutive successes since the TASK-005 review checkpoint; threshold = 5 — next success triggers /autonomous-review)
- Deploy: success — colonize:latest rebuilt (multi-stage docker build, ~10s builder phase), docker-app-1 recreated, healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":5.984}`); root `/` returns 200 (apps/web/dist served via @fastify/static). Image manifest sha256:bcb9a1144e75. New `free-tex-packer-core` devDep installs cleanly inside the builder stage; runtime image unaffected (devDep, not bundled).
- Lessons learned:
  - First content-only PR — palette is plain TS data, atlas script is a CLI-style `.mjs` that's safe to re-run with no inputs (exits 0 with an info notice). Keeps the pipeline runnable before any sprite art exists.
  - `free-tex-packer-core` 0.3.5 is CommonJS but imports cleanly via ESM default-import. Brings transitive deps (jimp 0.2.x, tinify 1.x, mustache, maxrects-packer) — install adds ~79 packages but no native build steps and no audit failures. Acceptable given the task explicitly named the wrapper.
  - PR #15 auto-merged faster than the AGENT-LOG push; rebase-pull on main resolved cleanly. If this becomes routine, the skill could push the log entry from the feature branch instead and let the merge carry it.
- Notes: Ninth autonomous-run cycle. Streak: 4 consecutive successes since the TASK-005 review checkpoint (TASK-006 → TASK-007 → TASK-008 → TASK-009); the next successful run will hit successThreshold=5 and fire /autonomous-review.

---

### Run [2026-04-21 00:17]
- Task: TASK-010 — Load placeholder atlas in Phaser boot scene
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/16 (auto-merge enabled)
- Test counts: server=8, web=11 (was 8 — added asset-keys invariants + GameCanvas mount smoke), content=9, core=1, shared=2
- Files changed: apps/web/package.json, apps/web/src/App.{tsx,css}, apps/web/src/GameCanvas.{tsx,test.tsx}, apps/web/src/game/{asset-keys,boot-scene,main-menu-scene,create-game,index}.ts, apps/web/src/game/boot-scene.test.ts, apps/web/src/test-setup.ts, apps/web/scripts/prepare-assets.mjs, packages/content/package.json, packages/content/scripts/generate-placeholder-sources.mjs, packages/content/atlas-src/core/{tile_deck,tile_hull,tile_ocean}.png, .gitignore, package-lock.json, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 8 → 11; all other counts steady)
- Review proposed: true — https://github.com/g-chappell/colonize/pull/17 (5 consecutive successes since the TASK-005 review checkpoint — TASK-006 → TASK-007 → TASK-008 → TASK-009 → TASK-010 — threshold hit; /autonomous-review drafted 4 refinements)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, ~33s builder phase), manifest sha256:ab4f2631134c720eac1c15bff83f7a91ed55f2e08fb9920a8602c1832fcad6fe, docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":6.266}`). Root `/` serves apps/web/dist (200 OK) and `/atlas/core/spritesheet.{png,json}` both 200 — atlas pipeline confirmed end-to-end in prod image.
- Lessons learned:
  - Phaser 3 top-level module init calls `canvas.getContext('2d')` in CanvasFeatures.js, which throws under jsdom. Dynamic-importing the Phaser bundle inside `GameCanvas`'s `useEffect` keeps it out of the test module graph entirely; pair with a `HTMLCanvasElement.getContext = () => null` stub in test-setup so our own mount-guard probe stops triggering jsdom's "not implemented" virtualConsole warning.
  - Atlas pipeline shape: commit raw sprite PNGs under `packages/content/atlas-src/<atlas>/` (source), gitignore `atlas-out/` (pack-atlas output) and `apps/web/public/atlas/` (web-served copy). `apps/web` `predev`/`prebuild` runs pack-atlas then copies the packed folder in. One command path for dev + CI.
  - Placeholder sprite generator uses `pngjs` directly (added to content devDeps — was transitively available via free-tex-packer-core, but making it explicit keeps the script's deps honest) and pulls colours from the OTK palette so the placeholder atlas already respects tonal registers.
  - Vite build warns on the Phaser chunk (~1.48 MB uncompressed / 340 kB gzip). Acceptable for MVP — code-splitting is a later concern and not in task scope.
- Notes: Tenth autonomous-run cycle. Fifth consecutive success since the TASK-005 review checkpoint (TASK-006 → TASK-007 → TASK-008 → TASK-009 → TASK-010). Streak hits successThreshold=5 — /autonomous-review should fire in Step 15 against this log + main.

---

### Run [2026-04-21 01:10]
- Task: TASK-011 — Create event bus in apps/web/src/bus.ts
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/18 (auto-merge enabled)
- Test counts: server=8, web=20 (was 11 — added 9 bus tests), core=1, shared=2, content=9
- Files changed: apps/web/src/bus.ts (new), apps/web/src/bus.test.ts (new), apps/web/package.json, apps/web/tsconfig.json, packages/shared/src/index.ts, package-lock.json, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 11 → 20; all other counts steady)
- Review proposed: false (1 consecutive success since PR #17 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, ~33s builder), manifest sha256:4fec4e54b48f, docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":4.465}`); `/` serves apps/web/dist (HTTP 200). `@colonize/shared` now emitted into the runtime image via `COPY packages/shared/dist` (was already in the Dockerfile from earlier epics) — no Dockerfile edit required.
- Lessons learned:
  - `Record<string, unknown>` is too strict as a generic constraint for event-map types: an `interface { 'turn:advanced': { turn: number } }` is NOT assignable to it under `strict` because it lacks an index signature. Using `extends object` for the bus generic and removing the `EventMap` alias entirely keeps the typing end-to-end ergonomic for interface-shaped event maps (which are what GameEvents will be as feature tasks extend it via declaration merging).
  - ESLint `@typescript-eslint/no-empty-object-type` is on via `recommended`, so `interface GameEvents {}` would fail lint. Seeded the contract with one real starter event (`turn:advanced` — naturally needed by TASK-012 HUD + TASK-025 end-turn wiring) rather than disabling the rule; keeps the shared-package API tested end-to-end from day one.
  - `apps/web` wiring a new workspace dep (`@colonize/shared`) requires three co-ordinated touches: dependency in `package.json`, TS project reference in `tsconfig.json`, and running `npm install` at repo root to materialise the `node_modules/@colonize/shared` symlink. All three were needed this run — future workspace-linking tasks should expect the same triad.
- Notes: Eleventh autonomous-run cycle. First success since PR #17 merged the prior review batch (streak reset). Four more consecutive successes to re-hit successThreshold=5.

---

### Run [2026-04-21 02:10]
- Task: TASK-012 — Build HUD components (resource bar, year, end-turn)
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/19 (auto-merge enabled)
- Test counts: server=8, web=32 (was 20 — +8 HUD, +3 store faction, +1 App HUD smoke), core=1, shared=2, content=9
- Files changed: apps/web/src/hud/Hud.tsx (new), apps/web/src/hud/Hud.module.css (new), apps/web/src/hud/Hud.test.tsx (new), apps/web/src/store/game.ts, apps/web/src/store/game.test.ts, apps/web/src/App.tsx, apps/web/src/App.test.tsx, apps/web/src/App.css, CLAUDE.md, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 20 → 32; all other counts steady)
- Review proposed: false (2 consecutive successes since PR #17 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (manifest sha256:f54212936827), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":7.063}`); `/` serves apps/web/dist (HTTP 200). Build artefacts sizes stable (web bundle 148.85 kB main + 1,483.58 kB phaser).
- Lessons learned:
  - Vite supports `*.module.css` out of the box and `vite/client` (already in `apps/web/tsconfig.json` types) declares the ambient import — no extra tooling, no `.d.ts` shim, no devDep bump. Picking CSS Modules over Tailwind for the HUD kept the PR surface-area at just source files.
  - Under vitest `css: false` (default), CSS Module imports return a Proxy that resolves any accessed key to a stub — tests see `styles.hud` as undefined/ignored className. Identifying HUD elements via `data-testid` rather than class names makes tests robust to that and to future CSS-Module hashing in production.
  - Layering React chrome over the Phaser canvas works cleanly with a `.game-stage` wrapper (`position: relative`) + `.hud { position: absolute; inset: 0; pointer-events: none }` + `.hud > * { pointer-events: auto }`. The inherited-none + child-auto pattern lets overlay regions (top-left, top-right, bottom-right) stay click-through where empty, so Phaser receives map clicks unimpeded. Future HUD additions should keep to this container pattern.
- Notes: Twelfth autonomous-run cycle. Streak=2 toward successThreshold=5. Faction chip reads from store so TASK-014 (faction-select screen) already has its data slot wired — only a `setFaction` call needed from the select UI.

---

### Run [2026-04-21 03:15]
- Task: TASK-013 — Main menu screen (React)
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/20 (auto-merge enabled)
- Test counts: server=8, web=39 (was 32 — +5 MainMenu, +3 store screen state, –1 App HUD smoke replaced by 3 screen-routing tests net +2 but App itself went 4 → 3), core=1, shared=2, content=9
- Files changed: apps/web/src/menu/MainMenu.tsx (new), apps/web/src/menu/MainMenu.module.css (new), apps/web/src/menu/MainMenu.test.tsx (new), apps/web/src/store/game.ts, apps/web/src/store/game.test.ts, apps/web/src/App.tsx, apps/web/src/App.test.tsx, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 32 → 39; all other counts steady)
- Review proposed: false (3 consecutive successes since PR #17 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, manifest sha256:38938ce5e829), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health. Build artefact sizes stable (web main 151.16 kB + phaser 1,483.58 kB).
- Lessons learned:
  - Screen routing for single-page flows lives cleanly in the zustand store as a `screen` literal-union (`'menu' | 'faction-select' | 'game'`) rather than a router — no extra dep, faction-select stub is trivially ownable by TASK-014, and tests can set the screen state directly in `beforeEach` without spelunking through navigation events.
  - Menu-screen-as-default broke the previous App tests that assumed the game stage mounts on load (HUD test was looking for `hud-end-turn` at root). Refactor was to split the App suite into default-screen (menu) vs explicit-`setScreen('game')` tests — cheaper than keeping the game-stage at root and gating menu as a modal, and it mirrors the actual production UX.
  - Inline SVG heraldry is a reasonable MVP choice: two mirrored `<g>` groups with `transform="scale(-1 1)"` give us paired-dragon silhouettes without any new asset pipeline. Dedicated pixel-art heraldry lands with content epics, but the test just pins the role + aria-label so swapping the SVG for a raster later won't churn tests.
- Notes: Thirteenth autonomous-run cycle. Streak=3 toward successThreshold=5 (TASK-011 → TASK-012 → TASK-013 since PR #17 review checkpoint).

---

### Run [2026-04-21 04:13]
- Task: TASK-014 — Faction select screen
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/21 (auto-merge enabled)
- Test counts: server=8, web=42 (was 39 — +3 FactionSelect component tests; App test count held at 3 after swapping placeholder assertion for real-component assertion), core=1, shared=2, content=15 (was 9 — +6 factions module tests)
- Files changed: packages/content/src/factions.ts (new), packages/content/src/factions.test.ts (new), packages/content/src/index.ts, apps/web/src/menu/FactionSelect.tsx (new), apps/web/src/menu/FactionSelect.module.css (new), apps/web/src/menu/FactionSelect.test.tsx (new), apps/web/src/App.tsx, apps/web/src/App.test.tsx, apps/web/package.json, apps/web/tsconfig.json, package-lock.json, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 39 → 42, content 9 → 15; all other counts steady)
- Review proposed: false (4 consecutive successes since PR #17 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (manifest sha256:bc3b600435db, multi-stage docker ~33s builder), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":7.892}`). Web bundle sizes stable (main 154.89 kB + phaser 1,483.58 kB). `colonize:previous` tag preserved for rollback.
- Lessons learned:
  - Adding a new workspace dep (`@colonize/content` on `apps/web`) takes the established triad: `dependencies` entry in `package.json`, TS project-reference in `tsconfig.json`, and `npm install` at repo root to materialise the symlink. No `paths` alias needed — the existing `moduleResolution: bundler` + workspace symlink is enough. This is the second time this triad has been required (TASK-011 wired `@colonize/shared` the same way); the pattern is settled.
  - Per-faction mechanical-identity copy lives on the faction record itself (a `bonus` string) rather than deferring to TASK-063 for hook-wiring. The select screen surfaces the intent now as player-visible flavour; TASK-063 will later wire the runtime hooks, and the strings can evolve independently without touching the UI.
  - Inline SVG crests follow the same playbook as TASK-013's Heraldry: one `<defs>` shield path per faction, one per-faction sigil group, all scoped by `data-testid="faction-crest-<id>"` so tests pin structure-not-style. Keeps the MVP asset-pipeline-free while leaving a clean swap-point for pixel-art crests when the art epic lands.
- Notes: Fourteenth autonomous-run cycle. Streak=4 toward successThreshold=5 (TASK-011 → TASK-012 → TASK-013 → TASK-014 since PR #17 review checkpoint). Next success will trigger a review pass.

---

### Run [2026-04-21 05:10]
- Task: TASK-017 — Tile type enum + Map model in packages/core
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/22 (merged)
- Test counts: server=8, web=42, content=15, core=27 (was 1 — +22 GameMap, +4 TileType), shared=2
- Files changed: packages/core/src/index.ts, packages/core/src/map/index.ts (new), packages/core/src/map/tile.ts (new), packages/core/src/map/tile.test.ts (new), packages/core/src/map/map.ts (new), packages/core/src/map/map.test.ts (new), roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (core 1 → 27; all other counts steady)
- Review proposed: true — https://github.com/g-chappell/colonize/pull/23 (5 consecutive successes since PR #17 checkpoint — TASK-011 → TASK-012 → TASK-013 → TASK-014 → TASK-017 — threshold hit; /autonomous-review drafted 4 refinements covering HUD overlay click-through, inline-SVG heraldry, string-literal const-object enums, and zustand-store screen routing)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, ~30s builder, manifest list sha256:8cdde3108b66 / image sha256:af96cede673e), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":4.818}`). Web bundle sizes stable (main 154.89 kB + phaser 1,483.58 kB). `colonize:previous` tag preserved for rollback. New `@colonize/core` map module is part of `packages/core/dist` shipped into the runtime image (already covered by the existing `COPY --from=builder /app/packages/core/dist` step in the Dockerfile).
- Lessons learned:
  - Used a const-object + derived `type` for `TileType` instead of a TypeScript `enum`. `isolatedModules: true` (tsconfig.base.json) makes `const enum` unsafe across project boundaries, and a regular `enum` would inflate the @colonize/core surface with a runtime object that's mostly redundant with the typed string-literal union. Const-object pairs cleanly with the JSON serialise/revive path: `tiles` are plain strings on the wire and survive `JSON.parse` without an enum-rebuild step.
  - Picked 8-connected neighbours (Moore neighbourhood) over 4-connected for parity with Sid Meier Colonization 1994. EPIC-04 pathfinding (TASK-028 A*) and EPIC-03 fog-of-war (TASK-022) will both consume `neighbours()`; if either later wants 4-connected (e.g. for sailing-only constraints), the call site can filter `dx === 0 || dy === 0` rather than us splitting the API.
  - `noUnusedLocals` + `exactOptionalPropertyTypes` made `tiles[i]!` non-null assertion necessary at the post-validation copy site in `fromJSON` even though the loop has just guarded each entry — this is the strict-mode tradeoff. Keeping the validation loop and the copy loop separate (rather than fusing them) keeps the error message specific to the offending index, which matters more for save-format debugging than the micro-cost of a second pass.

---

### Run [2026-04-21 06:10]
- Task: TASK-018 — Procedural map generator
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/24 (auto-merge enabled)
- Test counts: server=8, web=42, content=15, core=78 (was 27 — +51 generator tests), shared=2
- Files changed: packages/core/src/map/generate.ts (new), packages/core/src/map/generate.test.ts (new), packages/core/src/map/index.ts, packages/core/src/index.ts, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (core 27 → 78; all other counts steady)
- Review proposed: false (1 consecutive success since PR #23 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, ~30s builder, manifest list sha256:8e0e646cf116 / image sha256:155497c3f921), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":5.505}`). Web bundle sizes stable (main 154.89 kB + phaser 1,483.58 kB). `colonize:previous` tag preserved for rollback. Generator module is part of `packages/core/dist` already copied into the runtime image — no Dockerfile change required.
- Lessons learned:
  - Mulberry32 is the right PRNG for procedural map generation here: 32-bit state, <10 lines, deterministic for a given integer seed (including negatives — `seed | 0` normalises to 32-bit signed on entry). No extra dep, survives tsc strict + `isolatedModules` cleanly, and lets every stage of the generator draw from a single seeded stream so the whole map is reproducible from one `{seed, width, height}` triple.
  - Organic island + red-tide blobs are cheapest to grow via "pick random existing cell → pick random Ocean neighbour → set" with a stall counter (targetSize × 3 stalls ⇒ abort). Simpler than cellular-automata steps and produces the irregular silhouettes C64/retro Colonization had. Works because corridor/cities are placed first and islands only overwrite Ocean — no overlap handling needed.
  - Faction starts split the map into a `ceil(sqrt(n)) × ceil(n/cols)` grid, jitter the slot centre, then BFS outward to the nearest unused Ocean tile. This is robust to corridor drift (the slot centre might land on RayonPassage) and to islands covering a whole slot (BFS escapes outward), while keeping starts well-spread — the quadrant-spread assertion passes across every seed tested. Keeping factionCount as a bare integer (not faction IDs) honours the core-is-framework-free rule: no `@colonize/content` dep crept in.
  - `MIN_MAP_WIDTH=20 / MIN_MAP_HEIGHT=15` is enough headroom for the full feature budget (corridor+cities ≈ 27 cells, islands 8–90 cells, red-tide 3–24 cells, FM 3–6 cells, all fit in 300 cells with margin) while still rejecting obviously-too-small inputs up-front. Validation throws `TypeError` for non-integer seed and `RangeError` for dimensions/factionCount out of range — matches the pattern `GameMap` set in TASK-017.
- Notes: Fifteenth autonomous-run cycle. Streak=1 since PR #23 review checkpoint; four more consecutive successes to re-hit successThreshold=5.

---

### Run [2026-04-21 07:10]
- Task: TASK-019 — Phaser GameScene + tile renderer
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/25 (auto-merge enabled)
- Test counts: server=8, web=50 (was 42 — +8 tile-atlas tests covering frame coverage, atlas-src PNG presence, layout arithmetic), content=15, core=78, shared=2
- Files changed: apps/web/src/game/game-scene.ts (new), apps/web/src/game/tile-atlas.ts (new), apps/web/src/game/tile-atlas.test.ts (new), apps/web/src/game/asset-keys.ts, apps/web/src/game/create-game.ts, apps/web/src/game/index.ts, apps/web/src/game/boot-scene.test.ts, packages/content/scripts/generate-placeholder-sources.mjs, packages/content/atlas-src/core/tile_ocean_01.png (new), packages/content/atlas-src/core/tile_ocean_02.png (new), packages/content/atlas-src/core/tile_rayon_passage.png (new), packages/content/atlas-src/core/tile_island.png (new), packages/content/atlas-src/core/tile_floating_city.png (new), packages/content/atlas-src/core/tile_red_tide.png (new), packages/content/atlas-src/core/tile_fata_morgana.png (new), roadmap/roadmap.yml, ROADMAP.md — plus a follow-up fix commit on the branch (tile-atlas.test.ts switched from reading the packed-atlas JSON to reading the committed atlas-src PNG filenames, so CI can assert frame coverage without running `prepare-assets` first)
- Regression alert: false (web 42 → 50; all other counts steady)
- Review proposed: false (2 consecutive successes since PR #23 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, manifest list sha256:a1eb07cbc479 / image sha256:9d4e2669f214, builder ~30s incl. placeholder atlas regeneration for the 7 new tile PNGs), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":5.649}`). Web bundle sizes unchanged (main 154.89 kB + phaser 1,486.02 kB). `colonize:previous` tag preserved for rollback. New atlas sources are baked into the runtime image via the existing `COPY --from=builder /app/packages/content` step — no Dockerfile change required.
- Lessons learned:
  - The source/packed/served atlas pipeline landed in TASK-010 finally paid off this cycle — adding six new terrain sprites + two extra ocean frames only needed extensions to `generate-placeholder-sources.mjs` and the committed `atlas-src/core/*.png` inputs; `prepare-assets` auto-repacks on `predev`/`prebuild` so no one has to remember the intermediate step. Tests assert frame coverage by reading the committed `atlas-src/core/*.png` filenames directly (stripping `.png`) rather than the packed-atlas JSON — that JSON is gitignored and only materialises after `prepare-assets`, which CI doesn't run before `npm test`. Initial test revision tried to read `public/atlas/core/spritesheet.json` and failed in CI; the second commit (`fix: read atlas source PNGs not packed JSON …`) is the durable shape.
  - Pulling the tile-layout maths into three pure helpers (`tileCenterInWorld`, `mapWorldBounds`, `renderedTileSize`) in `tile-atlas.ts` kept GameScene's arithmetic unit-testable under jsdom without spinning up a real Phaser runtime. Phaser's module graph pokes WebGL/Canvas at import time, so anything that needs test coverage has to live outside `game-scene.ts`'s import chain — otherwise the test-runner setup's `getContext → null` stub isn't enough and the whole scene module cascades Phaser into the test.
  - Ocean-tile animation phase is seeded deterministically from `((x*7 + y*3) % 11) / 11` via `anims.setProgress()`. This gives every ocean tile a per-tile offset without any RNG dependency, so two runs from the same GameMap produce the same animation state — useful later for deterministic replays, and cheaper than storing per-tile phase state.
- Notes: Sixteenth autonomous-run cycle. Streak=2 since PR #23 review checkpoint (TASK-018 → TASK-019); three more consecutive successes to re-hit successThreshold=5.

---

### Run [2026-04-21 09:04]
- Task: N/A — cycle skipped before selection
- Outcome: skipped
- PR: N/A
- Test counts: N/A — no validation run
- Files changed: AGENT-LOG.md (this entry)
- Regression alert: false
- Review proposed: false
- Deploy: n/a
- Lessons learned:
  - Step 2 precheck halted the run: `git status --porcelain` reported `M scripts/notify-cycle.sh` — an uncommitted edit in the working tree (adds a PR-body "## Summary" blurb and a condensed "Outcome · Deploy" header line to the ntfy.sh payload). The diff pre-dates this cycle; treating it as in-progress user work per the skill's "never discard dirty tree" contract.
  - Also cleaned up post-merge: fast-forwarded local main over 8caeead (PR #27 merge — `.github/workflows/deploy.yml` deletion from chore/remove-deploy-workflow). The now-merged feature branch is left in place for the user to delete; `git branch -d` on a branch still holding the HEAD we came from would refuse anyway, and the Step 3 cleanup only runs on clean runs.
  - Action required: either commit or stash `scripts/notify-cycle.sh` and re-fire `/autonomous-run` (next scheduled fire is top-of-hour via `claude-colonize.timer`). The edit itself looks intentional and mergeable — a short commit on a dedicated branch would unblock the queue.
- Notes: Eighteenth autonomous-run cycle — **skipped**, not counted toward the 5-success streak. Prior streak still at 3 (TASK-018 → TASK-019 → TASK-020) since the PR #23 review checkpoint; the streak resumes on the next successful cycle without needing to restart.

---

### Run [2026-04-21 08:10]
- Task: TASK-020 — Camera controls: pan / zoom / mobile touch
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/26 (auto-merge enabled)
- Test counts: server=8, web=77 (was 50 — +23 camera-controls.test.ts, +4 store/game.test.ts), content=15, core=78, shared=2
- Files changed: apps/web/src/game/camera-controls.ts (new), apps/web/src/game/camera-controls.test.ts (new), apps/web/src/game/game-scene.ts, apps/web/src/game/index.ts, apps/web/src/store/game.ts, apps/web/src/store/game.test.ts, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 50 → 77; all other counts steady)
- Review proposed: false (3 consecutive successes since PR #23 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, builder ~30s, manifest list sha256:ba22eb9326e1, image sha256:4a8f1864e222), docker-app-1 recreated rolling. Healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":4.915}`). Web bundle sizes stable (main 154.99 kB + phaser 1,488.69 kB). `colonize:previous` tag preserved for rollback. No Dockerfile change required — the new camera-controls module is part of `apps/web/dist` already copied into the runtime image.
- Lessons learned:
  - Pure-TS camera math (clampZoom, applyWheelZoom, applyPinchZoom, keyPanDelta, pointerDistance) lives in its own `camera-controls.ts` module so it stays out of `game-scene.ts`'s Phaser-importing module graph and is unit-testable under jsdom. Same pattern as TASK-019's tile-atlas helpers — anything that needs test coverage in apps/web has to live outside any module Phaser-importing module's transitive closure, otherwise the test-runner's `getContext → null` stub isn't enough and Phaser's WebGL/Canvas init cascades into the test environment.
  - The follow-target sprite from TASK-019 stays as the programmatic "jump-to" mechanism, but manual user input (drag, pinch, wheel, arrow keys) calls `cam.stopFollow()` so the user is always in control once they touch the camera. `setCameraFocus()` re-engages follow so the next programmatic recenter still glides — this gives both APIs a clean coexistence without either fighting the other.
  - Cursor-anchored wheel zoom (the world point under the pointer stays under the pointer) makes the wheel feel native — without it, zooming in zooms toward the screen centre and the player loses their bearing. The math is straightforward (compute world coord under pointer pre-zoom, set new zoom, re-pan to keep that world coord under pointer) and self-contained inside `handleWheel`.
  - Per-game camera memory persists in the zustand store (`cameraView: { scrollX, scrollY, zoom } | null`) rather than localStorage. Reset clears it so a new game starts at the default focus; persistence across browser reloads will fall out for free if/when EPIC-08's save system serialises the store. No new dependencies required.
- Notes: Seventeenth autonomous-run cycle. Streak=3 since PR #23 review checkpoint (TASK-018 → TASK-019 → TASK-020); two more consecutive successes to re-hit successThreshold=5.

---

### Run [2026-04-21 09:43]
- Task: N/A — skipped at precheck
- Outcome: skipped
- PR: N/A
- Test counts: N/A — no validation run
- Files changed: AGENT-LOG.md (this entry)
- Regression alert: false
- Review proposed: false
- Deploy: n/a
- Lessons learned:
  - Step 2 precheck halted the run: `git status --porcelain` reported `?? .claude/settings.local.json` — an untracked per-machine Claude Code settings file (local Bash permission allow-list) that is not covered by `.gitignore`. Treating it as dirty per the skill's strict clean-tree contract.
  - This is a recurring-class blocker: `.claude/settings.local.json` is created and mutated by Claude Code itself on every interactive session as the user approves new commands. Every autonomous-run will trip on it until the path is gitignored. The fix is a one-line addition to `.gitignore` (`.claude/settings.local.json`), mirroring how `.tsbuildinfo` was added after TASK-002 to stop leaking a similar tool-generated artefact.
  - Also cleaned up post-merge: fast-forwarded local main over fef464f (two commits — ntfy-blurb merge #28 + the retroactive hardening commit 2e098dc). Step 3 branch-cleanup was skipped because this is a dirty-tree early-return.
  - Action required: add `.claude/settings.local.json` to `.gitignore` on a dedicated branch (`chore/gitignore-claude-local-settings` or rolled into the next chore-bundle PR). Next scheduled fire is top-of-hour via `claude-colonize.timer`; until the gitignore lands, every cycle will repeat this skip.
- Notes: Nineteenth autonomous-run cycle — **skipped**, not counted toward the 5-success streak. Prior streak still at 3 (TASK-018 → TASK-019 → TASK-020) since the PR #23 review checkpoint; the streak resumes on the next successful cycle without needing to restart.

---

### Run [2026-04-21 09:55]
- Task: TASK-021 — Visibility model in core (unseen / seen / visible)
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/31 (auto-merge enabled)
- Test counts: server=8, web=77, content=15, core=105 (was 78 — +27 visibility tests covering type registry, construction, get/inBounds, reveal Chebyshev geometry + clipping + rejection, demoteVisibleToSeen idempotence + turn-loop re-reveal, toJSON/fromJSON round-trip + validation), shared=2
- Files changed: packages/core/src/visibility/visibility.ts (new), packages/core/src/visibility/visibility.test.ts (new), packages/core/src/visibility/index.ts (new), packages/core/src/index.ts, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (core 78 → 105; all other counts steady)
- Review proposed: false (4 consecutive successes since PR #23 review checkpoint; threshold = 5)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, builder ~31s, manifest list sha256:1e4d12357813466a3afe0f8b8f036875d31c855ffe8e231c19416fcd5fe1968a, image sha256:063f2745b9ea). The compose stack was recreated from scratch this cycle (network + db-data volume both created fresh — the previous compose project had evidently been torn down between cycles; no impact since the db schema is empty pre-EPIC-09). docker-app-1 came up clean, healthcheck 200 on attempt 2 at http://localhost:3000/health (`{"ok":true,"version":"0.0.0","uptime":9.958}`). Web bundle sizes held steady (main 154.99 kB + phaser 1,488.69 kB). `colonize:previous` tag preserved for rollback. No Dockerfile change needed — `packages/core/dist` already ships the new `visibility/` module via `tsc -b`.
- Lessons learned:
  - Visibility as a save-format-bound const-object keeps the wire format stable — `{unseen | seen | visible}` are the string literals that land in serialized save JSON. Followed the same pattern as TileType: const object + derived union + `ALL_VISIBILITY_STATES` readonly array + `isVisibility` narrowing guard used cell-by-cell inside `fromJSON`. Any future rename becomes a save-version migration, not a refactor.
  - Split the turn-loop into two explicit ops instead of baking it into `reveal`: (a) `demoteVisibleToSeen()` — every currently-visible cell drops to `seen`; (b) re-apply `reveal(pos, sight)` from each unit/colony. The turn manager (TASK-024) and the movement/colony-placement callers (TASK-026+) orchestrate this; the visibility module stays a pure primitive with no notion of "turn". This is the standard Civ-style fog-of-war recompute pattern and avoids the contribution-count bookkeeping that an incremental scheme would demand.
  - Chebyshev distance for the sight circle (square in screen space) — matches the 8-neighbour semantics `GameMap.neighbours` already exposes, so a unit's `sight=1` radius exactly covers its immediate neighbours. Simpler than Euclidean, and the extra corner tiles at diagonal distance √2 are cheap narrative "you spotted something in the distance" territory.
  - Line-of-sight blockers (terrain that obstructs vision, e.g. fog banks, red-tide obscuring ships behind it) are deliberately deferred — the task scope is the *model* (TASK-021), not the LoS algorithm. Adding blocker-aware flood fill now would entangle the primitive with TileType semantics before the movement/unit systems land.
- Notes: Twentieth autonomous-run cycle. Streak=4 since PR #23 review checkpoint (TASK-018 → TASK-019 → TASK-020 → TASK-021); one more consecutive success to re-hit successThreshold=5 and arm `/autonomous-review`.

---

### Run [2026-04-21 10:17]
- Task: TASK-022 — Fog overlay in GameScene renderer
- Outcome: success
- PR: https://github.com/g-chappell/colonize/pull/32 (auto-merge enabled)
- Test counts: web=94 (was 77 — +17 fog-overlay-state tests covering alpha constants, `fogAlphaFor` mapping, `interpolateFogAlpha` clamping + linearity, construction dimension validation, sync no-op/same-state, unseen→seen + unseen→visible animated reveals with mid-animation sampling, visible→seen and seen→visible instant snaps, mid-animation re-sync, `hasActiveTransitions` idle vs in-flight), core=105, content=15, shared=2, server=8
- Files changed: apps/web/src/game/fog-overlay-state.ts (new), apps/web/src/game/fog-overlay-state.test.ts (new), apps/web/src/game/fog-overlay.ts (new), apps/web/src/game/game-scene.ts, apps/web/src/game/create-game.ts, apps/web/src/game/index.ts, roadmap/roadmap.yml, ROADMAP.md
- Regression alert: false (web 77 → 94; all other counts steady)
- Review proposed: pending (streak=5 since PR #23 review checkpoint — successThreshold met; `/autonomous-review` fires at Step 15 after deploy log is pushed)
- Deploy: success — colonize:latest rebuilt (multi-stage docker, builder ~32s, web bundle sizes steady at 154.99 kB main + 1,491.69 kB phaser chunk). Image manifest list sha256:8ed41e0e086022139b29b0f52883bd624418b2884f6615a8a73c13a31b466540, config sha256:8ab4d7d4e0c86c18ba566cc6a3b1ccf2c558fd4d8d14f697534442213b9c8b68. docker-app-1 recreated via rolling strategy; healthcheck 200 on attempt 2 at http://localhost:3000/health. `colonize:previous` tag preserved for rollback. No Dockerfile or compose changes needed — the new `fog-overlay*.ts` modules ship as part of the existing `apps/web/dist` Vite bundle.
- Lessons learned:
  - Split the fog into two modules — `fog-overlay-state.ts` (pure TS, imports only @colonize/core, fully unit-testable under jsdom) and `fog-overlay.ts` (Phaser wrapper, untestable under jsdom per the "browser-only libraries under jsdom" note in CLAUDE.md). Mirrors the same separation already used for camera math (`camera-controls.ts` tested + `game-scene.ts` untested). All 17 new tests live in the pure module; the Phaser wrapper is verified at build-time via typecheck + ships unverified to Playwright territory, as CLAUDE.md mandates ("Phaser scene tests are hard; prefer logic-first tests").
  - Chose `RenderTexture.fill(color, alpha, x, y, w, h)` per tile inside a single RenderTexture GameObject over a `BitmapMask` on the terrain layer. The task brief said "single render-texture mask rather than per-tile sprites" — the "single" part is satisfied (one overlay GameObject, O(W*H) fillRect calls per redraw, no sprites). Going the BitmapMask route would have forced the "seen" dimming into terrain-layer alpha, coupling the overlay's rendering to the terrain's blend stack. Keeping fog as a top-layer tinted texture lets "seen" be a simple alpha-0.5 black tint that composites cleanly on top of whatever the terrain layer draws (including the animated ocean).
  - Unseen→seen and unseen→visible animate over 400ms; demotions (visible→seen) and re-reveals of known terrain (seen→visible) snap instantly. The task text said "animated reveal when a tile transitions unseen→seen" — only the *revelation* moment (first exposure to a tile) reads as a "reveal" to the player. Demotions happen as a whole-faction batch at turn end and would look noisy if each one faded. Re-reveals of already-seen terrain don't surprise the player with new information, so a fade is wasted motion. Kept the policy symmetric in the code (the `before === Visibility.Unseen` predicate in `FogOverlayState.sync`) so it's trivial to flip later if play-testing disagrees.
  - `GameSceneInitData.visibility` is optional. No existing caller passes it (the web UI currently only invokes `createGame()`, not `startGameScene()`), so the overlay is opt-in until the turn-advance / faction-bootstrap flows land. `GameScene.syncFogOverlay(visibility)` is exposed for that future wiring; for now it's a public hook with no caller, which keeps the scope of this PR to "the overlay exists and works when given a visibility model" rather than sweeping in the turn-loop integration.
  - `exactOptionalPropertyTypes: true` (set in tsconfig.base) forbids writing `{ foo: undefined }` into a type where `foo?` is declared. Tripped on `startGameScene`'s spread-options pattern; fixed by conditional object spread (`options.visibility ? { ...data, visibility } : data`) rather than passing the value through as-maybe-undefined. Worth remembering for any future task that threads optional fields through a config object.
  - Prettier's `--write` on new files is a must before `format:check` — ran it up front this cycle and the check passed first try, no fix-cycle needed. Consistent with TASK-006/007/010 learning in Step 8 of the skill.
- Notes: Twenty-first autonomous-run cycle. Streak=5 since PR #23 review checkpoint — `successThreshold` hit; `/autonomous-review` arms at Step 15 after the merge + deploy land.

---
