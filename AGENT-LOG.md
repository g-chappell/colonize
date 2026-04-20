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
