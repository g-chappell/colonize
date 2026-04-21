# Review Log

Self-improvement review entries. Written by `autonomous-review` every N
consecutive successes. Separate from `AGENT-LOG.md` so the run log stays
gap-free.

## Format

```
---

## Review [YYYY-MM-DD HH:MM] — after TASK-XXX through TASK-YYY
- Success streak: N
- Patterns identified: <bulleted list>
- Proposals written to: .claude/approvals/PENDING.md
- Proposals count: N (before de-dup: M)
- De-duplicated via: CLAUDE.md + approvals/history.md
- Status: pending-approval | approved | rejected | mixed
- Approved at: <ISO timestamp or n/a>
```

---

## Review History

---

## Review [2026-04-20 20:15] — after TASK-001 through TASK-005
- Success streak: 5
- Patterns identified: 4
- Proposals drafted: 4
- Proposals de-duplicated: 4 - 1 (1 dropped — the npm-install-after-workspace lesson was folded into the cross-workspace import refinement rather than landed as its own commit)
- Refinements committed: 2
- Refinements deferred: 1 (autonomous-run Step 3 cleanup fix — blocked on a pending write-permission prompt for `.claude/skills/autonomous-run/SKILL.md`; will retry next cycle)
- PR: https://github.com/g-chappell/colonize/pull/8
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — Architecture notes + new "Scaffolding hygiene" section)

---

## Review [2026-04-21T00:37Z] — after TASK-006 through TASK-010
- Success streak: 5
- Patterns identified: 4
- Proposals drafted: 4
- Proposals de-duplicated: 4 (all novel vs CLAUDE.md + approvals/history.md + last 5 review PRs, Jaro-Winkler threshold 0.85)
- Refinements committed: 4
- PR: https://github.com/g-chappell/colonize/pull/17
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — Testing patterns + Architecture notes), .claude/skills/autonomous-run/SKILL.md (Steps 8, 10, 12)
- Refinements:
  1. dae9f62 — codify jsdom guard for browser-only libraries (Phaser/canvas → dynamic import + getContext stub)
  2. 1caef8a — codify asset-pipeline source/packed/served triad
  3. 5827d01 — defer AGENT-LOG push to main until feature PR merges (fixes feature-PR BEHIND race — PR #9 covered only the review-PR variant)
  4. 849db43 — prettier --write edited files before local validation (TASK-006/007/010 recurrence)


---

## Review [2026-04-21T05:18Z] — after TASK-011 through TASK-017
- Success streak: 5 (TASK-011 → TASK-012 → TASK-013 → TASK-014 → TASK-017 since PR #17 review checkpoint)
- Patterns identified: 4
- Proposals drafted: 4
- Proposals de-duplicated: 4 (all novel vs CLAUDE.md + approvals/history.md + last 2 review PRs; the workspace-dep triad lesson was already covered by the existing "Cross-workspace TS imports" rule, so no fifth proposal landed)
- Refinements committed: 4
- PR: https://github.com/g-chappell/colonize/pull/23
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — Architecture notes; single hunk starting line 111, Tier 1 untouched)
- Refinements:
  1. c0dfc99 — codify HUD overlay click-through pattern (`pointer-events: none` container + `> *` auto)
  2. 248b4a3 — codify inline-SVG-for-heraldry pattern for pre-art-epic chrome (data-testid pinned for raster swap-point)
  3. 08a217b — codify string-literal const-object pattern for save-format-bound kinds (over `enum` / `const enum`)
  4. 8fdb26e — codify zustand-store screen-routing literal-union (no react-router; `setState` in beforeEach for tests)

---

## Review [2026-04-21T10:30Z] — after TASK-018 through TASK-022
- Success streak: 5 (TASK-018 → TASK-019 → TASK-020 → TASK-021 → TASK-022 since PR #23 review checkpoint; two intervening skipped cycles on dirty-tree did not reset the streak per the skill contract)
- Patterns identified: 2
- Proposals drafted: 2
- Proposals de-duplicated: 2 (both novel vs CLAUDE.md + approvals/history.md + PRs #8, #17, #23, Jaro-Winkler threshold 0.85 via `alreadyCovered`)
- Refinements committed: 2
- PR: https://github.com/g-chappell/colonize/pull/33
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — Testing patterns line 101 + Architecture notes line 123, Tier 1 [lines 57–73] untouched)
- Refinements:
  1. 13adafe — codify the pure-sibling module pattern for Phaser game code (camera-controls.ts, tile-atlas.ts, fog-overlay-state.ts as the three independent converges on the same split)
  2. e29ba6d — codify `exactOptionalPropertyTypes: true` gotcha + conditional-spread fix (TASK-017 + TASK-022 both tripped on optional-property-with-undefined; bundled the `array[i]!`-after-validation corollary in the same bullet)

---

## Review [2026-04-21T15:20Z] — after TASK-023 through TASK-028
- Success streak: 5 (TASK-023 → TASK-024 → TASK-025 → TASK-026 → TASK-027 → TASK-028 since PR #33 review checkpoint; crossed threshold on TASK-028)
- Patterns identified: 3
- Proposals drafted: 3
- Proposals de-duplicated: 3 (all novel vs CLAUDE.md + approvals/history.md + PRs #17, #23, #33; Jaro-Winkler threshold 0.85 via `alreadyCovered`)
- Refinements committed: 3
- PR: https://github.com/g-chappell/colonize/pull/39
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 Architecture notes, three new bullets appended after line 123; Tier 1 [lines 57–73] untouched)
- Refinements:
  1. bcf84cf — codify rules-vs-flavor split across `@colonize/core` and `@colonize/content` (engine-read stats live in core; descriptive/flavour stats live in content; duplicate the rule-relevant number rather than open a `content → core` import edge). Drove by TASK-027 ship stats split; supporting by TASK-026 UnitType registry location.
  2. e00d06f — codify exhaustive `switch` as the reader-side tripwire for save-format const-object unions (no `default` case → adding a new literal fails the build at every consumer). Reader-side complement to PR #23 refinement #3 (const-object writer rule). Driven by TASK-028 `tileCost` over `TileType`.
  3. 808d32f — codify publish-primitive-defer-wiring seam (ship the entity's verb; leave iteration/scheduling to the task that owns the collection). Driven by TASK-024 (`TurnManager` hooks non-serialized) + TASK-026 (`Unit.resetMovement()` primitive, wiring deferred to roster task).

---

## Review [2026-04-21T20:22Z] — after TASK-030 through TASK-016
- Success streak: 5 (TASK-030 → TASK-015 → TASK-031 → TASK-032 → TASK-016 since PR #39 review checkpoint; crossed threshold on TASK-016)
- Patterns identified: 2
- Proposals drafted: 2
- Proposals de-duplicated: 2 (both novel vs CLAUDE.md + approvals/history.md + PRs #8, #17, #23, #33, #39; Jaro-Winkler threshold 0.85 via `alreadyCovered`)
- Refinements committed: 2
- PR: https://github.com/g-chappell/colonize/pull/45
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 Architecture notes — bus + screen-routing bullets rewritten in place; Tier 1 [lines 57–73] untouched)
- Refinements:
  1. d60abbb — codify cross-side event bus contract + React-side listener location (GameEvents in packages/shared as wire contract, declaration-merged; React-side subscribers that touch the Phaser game instance live in `GameCanvas.useEffect`; React never holds a `Phaser.Game` ref). Driven by TASK-016 `'game:pause'` / `'game:resume'` + supporting evidence from TASK-025 `'turn:advanced'` + TASK-030 `'unit:selected'`.
  2. 57caf4c — codify terminal-vs-overlay screen sub-shapes (overlay screens render on top of the mounted game view; App.tsx dispatches game-stage children for `'game'` AND every overlay family member; overlay tests assert hud + overlay root co-mount). Driven by TASK-016 `'pause'` overlay; pre-empts STORY-20 (colony), STORY-34 (diplomacy), STORY-26 (codex).
