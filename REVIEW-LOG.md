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

---

## Review [2026-04-22T01:25Z] — after TASK-033 through TASK-038
- Success streak: 5 (TASK-033 → TASK-023 → TASK-034 → TASK-029 → TASK-038 since PR #45 review checkpoint; crossed threshold on TASK-038)
- Patterns identified: 2
- Proposals drafted: 2
- Proposals de-duplicated: 2 (both novel vs CLAUDE.md + approvals/history.md + PRs #8, #17, #23, #33, #39, #45; Jaro-Winkler threshold 0.85 via `alreadyCovered`)
- Refinements committed: 2
- PR: https://github.com/g-chappell/colonize/pull/51
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 Architecture notes, two new bullets appended after the "Ship the entity's primitive" bullet; Tier 1 [lines 57–73] untouched)
- Refinements:
  1. e9bd751 — codify opaque-string-alias bridge for pre-registry save-format identifiers (`type FooId = string` + mutator `assertNonEmptyString` guard, tightened to a const-object union once the registry task lands — avoids a forbidden `content → core` import edge while the registry is still in flight). Driven by TASK-034 `ResourceId` / `ArtifactId` + TASK-038 `CrewId` / `BuildingId`.
  2. 3df426e — codify sorted-toJSON determinism for Map/Set-backed save primitives (entries must be emitted in stable sorted order so byte-parity holds across runs/machines; JS `Set` / `Map` insertion order would otherwise leak into `JSON.stringify` and break replay parity). Driven by TASK-034 CargoHold sorted toJSON + supporting evidence from TASK-029 DirectionLayer sparse row-major sort + TASK-038 Colony sorted crew/buildings; codifies the rule that FactionVisibility already followed implicitly.

---

## Review 2026-04-22T06:16Z — after TASK-035 through TASK-042
- Success streak: 5 (since PR #51 review checkpoint: TASK-035 → TASK-039 → TASK-040 → TASK-041 → TASK-042)
- Patterns identified: 2
- Proposals drafted: 2
- Proposals de-duplicated: 2 (both novel vs CLAUDE.md + approvals/history.md + PRs #23, #33, #39, #45, #51; Jaro-Winkler threshold 0.85 via `alreadyCovered`)
- Refinements committed: 2
- PR: https://github.com/g-chappell/colonize/pull/57
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 Architecture notes, two bullets appended after the "Map/Set-backed save-format emitters sort entries in toJSON" bullet; Tier 1 [lines 57–73] untouched)
- Refinements:
  1. 8747a47 — codify scalar seams for pre-registry axis values (primitives whose numeric axis will come from a not-yet-existing registry accept the scalar as a function argument with edge-validation, keeping the signature stable across the registry upgrade — the numeric-axis half of the opaque-string-alias rule). Driven by TASK-041 `buildingEffort` + `colonyProductionValue` proxies and TASK-042 `scaleTileYield(base, multiplier)` deferring the profession-multiplier lookup to its caller.
  2. 79a3c0b — codify trimming consumer-specific fields off save-format registries (drop speculative `effect` / `unlocked` / descriptive-subtype fields when the consumer system owning their semantics doesn't yet exist; consumers read the registry id through their own lookup and attach their own behaviour). Driven by TASK-035 dropping `LegendaryShipSlot.unlocked`, TASK-040 omitting `BuildingDefinition.effect`, and TASK-042 resisting TileType expansion for fishing-waters / kelp-forest / coastal-grove — three instances in one streak.

---

## Review [2026-04-22 13:27] — after TASK-045 through TASK-053
- Success streak: 5
- Patterns identified: 5 (pure-sibling extension; multi-slice atomic set; clamp-and-skip at store boundary; integer-only arithmetic; primitive-private validation guards)
- Proposals drafted: 3 (the latter two had only a single instance in this streak; deferred)
- Proposals de-duplicated: 3 (all novel vs CLAUDE.md + approvals/history.md + PRs #33, #39, #45, #51, #57)
- Refinements committed: 3
- PR: https://github.com/g-chappell/colonize/pull/66
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — one bullet appended in Testing patterns after the Phaser pure-sibling bullet; two bullets appended in Architecture notes before the "Trim consumer-specific fields" bullet; Tier 1 [lines 57–73] untouched)
- Refinements:
  1. 398e3ae — extend pure-sibling pattern to non-trivial React component logic (the *ergonomic* form distinct from the *strict* Phaser-isolation form; React surfaces with non-trivial pure logic — slider grids, multi-row forms, predicate gates — get a `*-math.ts` sibling tested directly with plain inputs). Driven by TASK-048 `trade-math.ts` + TASK-049 `transfer-math.ts`, both citing the existing Phaser-narrow bullet as not-quite-applicable.
  2. 6b88aaa — codify multi-slice zustand mutations in a single `set(...)` call (store actions touching ≥ 2 slices commit them atomically so external observers never see a partial-write race). Driven by TASK-048 `commitTrade` + TASK-049 `commitCargoTransfer` — both producing one `set` for unit-cargo + faction-state slices together.
  3. d0bd44e — codify clamp-and-skip on out-of-range qty at the zustand store boundary (per-line clamp + silent skip + continue with the rest of the cart, not throw or no-op the whole batch — the store boundary is user-input adjacent so cheap edge guards earn their keep, distinct from the Tier 1 strict-validation rule for `packages/core`). Driven by TASK-048 `commitTrade` silent-ignore on sell-exceeds-hold + TASK-049 `commitCargoTransfer` clamp on load > colonyStock — TASK-049's lesson explicitly cites TASK-048's posture.

---

## Review [2026-04-22 18:26] — after TASK-054 through TASK-063
- Success streak: 5
- Patterns identified: 6 (slice-driven self-mounting overlays; cooldowns-as-absolute-expiry-turn; discriminated-union outcomes; scoped useState confirmation modals; Esc handler hierarchy with stopPropagation; PlayableFactionId drift-guard sibling tests)
- Proposals drafted: 1 (five patterns appeared in only one AGENT-LOG entry — deferred per the ≥ 2-entry bar)
- Proposals de-duplicated: 1 (novel vs CLAUDE.md + bodies of PRs #33, #39, #45, #51, #57, #66)
- Refinements committed: 1
- PR: https://github.com/g-chappell/colonize/pull/72
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — one bullet inserted in Architecture notes between "Top-level screen routing" and "Heraldic / crest visuals"; Tier 1 [lines 57–74] untouched)
- Refinements:
  1. f3e9725 — codify slice-driven self-mounting overlays for "happens-during-an-action" events (CombatOverlay + RumourRevealModal pattern: unconditional mount in App.tsx's game-stage block + nullable store slice + `return null` when slice is null — distinct from the existing terminal/overlay-*screen* dichotomy which governs player-chosen UI-navigation chrome). Driven by TASK-055 CombatOverlay explicitly citing RumourRevealModal as the precedent (≥ 2 instances of the same decision without a rule to cite) — every upcoming transient event modal (turn-event banner, treaty-accepted confetti, discovery cutscene) will face the same choice.

---

## Review [2026-04-22 23:30] — after TASK-065 through TASK-071
- Success streak: 5
- Patterns identified: 3 cross-cutting (defensive-copy on pending-state getters; relational invariants over literal numbers in balance-tunable registry tests; FIFO-queue + re-fire-guard Set for threshold-crossing accumulators) + several one-off patterns deferred per the ≥ 2-entry bar (tri-state discriminated-union gate, `aria-valuenow` clamp, mirror-sibling-over-generic meta-rule, scalar-seam + registry-supplied-wave composition)
- Proposals drafted: 3
- Proposals de-duplicated: 3 (novel vs current CLAUDE.md + bodies of PRs #33, #39, #45, #51, #57, #66, #72)
- Refinements committed: 3
- PR: https://github.com/g-chappell/colonize/pull/78
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — three bullets inserted: one in Testing patterns at line 105, two in Architecture notes at lines 135 + 136; Tier 1 [lines 57–73] untouched)
- Refinements:
  1. 0f8be6e — codify per-access defensive copies on pending-state getters (primitive getters that expose queued/deferred internal collections return fresh per-call copies, never live references — complements the existing Map/Set-sorted-toJSON determinism rule which covers wire-format emission; this covers in-memory getter surface). Driven by TASK-065 `ChimesLedger.pendingEvents` fresh-array return + TASK-070 `ConcordFleetCampaign.pendingWaves()` deep-copied ship/ground arrays — two primitives, same defensive discipline, both citing prior unwritten precedent (`Colony.crew`, `CargoHold.toJSON`). Without the copy, an orchestrator's `.pop()`/`.splice()`/`.shift()` to "consume" an entry silently corrupts primitive invariants.
  2. 8b5c7cb — codify relational invariants over literal numbers in balance-tunable registry tests (tests pin design-intent relationships — monotonicity, ordering, cardinality, uniqueness, cross-tier escalation — rather than literal values; test that `pacified < standard < brutal` survives every rebalance that preserves intent; test that pins `turnsRequired === 12` breaks on first balance tweak). Driven by TASK-070's `concord-campaign.test.ts` (3-tier relational invariants) + TASK-065 chimes-registry + TASK-066 charter-registry + TASK-067 tension ladder — four-of-five entries exhibited the pattern. Generalises the existing "Rule-relevant stats" bullet's ordering-invariant prescription from duplicated-number case to all balance-tunable registry tests.
  3. 30a4da7 — codify FIFO-queue + re-fire-guard Set pattern for threshold-crossing accumulators (sibling `_pending: Event[]` + `_crossed: Set<number>` pair; walk ladder ascending; for each threshold where `prev < t <= next` AND `!_crossed.has(t)`, push event + add to set; drain via FIFO `consumeNextEvent`; sorted-toJSON round-trip; prefer mirrored sibling over generic `ThresholdAccumulator<Event>` base class). Driven by TASK-065 ChimesLedger + TASK-067 ConcordTensionMeter — two primitives shipping the same ~20-line shape independently; TASK-067's lesson explicitly says "mirrored the ChimesLedger shape rather than generalizing". Upcoming EPIC-07/09 reputation/fame/infamy ledgers on the roadmap will hit the same shape; codifying documents the mirror-over-generic call so a well-meaning refactor does not flatten both into a base class.

---

## Review [2026-04-23T04:35:00Z] — after TASK-036 through TASK-082
- Success streak: 5
- Patterns identified: 1 (deploy-script first-time-dependent-service trap)
- Proposals drafted: 1
- Proposals de-duplicated: 0 dropped (1 survived)
- Refinements committed: 1
- PR: https://github.com/g-chappell/colonize/pull/84
- Outcome: opened
- Files touched: scripts/deploy.sh
- Refinements:
  1. 3aeab90 — `scripts/deploy.sh` adds `up -d --no-recreate` pass before the rolling app recreate so freshly-introduced compose dependents (db, future Redis/mailcatcher/S3-mock) are started on first deploy. Driven by TASK-082's deploy outcome — first attempt rolled back after 90s healthcheck timeout because the postgres `db` container had never been created on the host; manual recovery was `docker compose up -d db` then re-run deploy. The two-pass shape (`up -d --no-recreate` then `up -d --no-deps --force-recreate app`) is steady-state-equivalent to the single-pass shape (the first pass is a no-op when all services are healthy) but auto-recovers from the missing-dependent case. CLAUDE.md note deliberately omitted because the script comment + commit message carry the rationale at the only call-site; a Tier 3 entry for a script-level invariant the script itself enforces would be noise.

---

## Review [2026-04-23 14:30] — after TASK-051, TASK-052, TASK-056, TASK-057, TASK-060
- Success streak: 5
- Patterns identified: 0 cross-cutting (≥ 2-entry) novel patterns
- Proposals drafted: 0
- Proposals de-duplicated: 0
- Refinements committed: 0
- PR: n/a
- Outcome: skipped-no-patterns
- Files touched: none

The five tasks in this window were heavy on *successful re-application* of already-codified Tier 3 rules — Scalar seams for pre-registry axis values (TASK-056 factionRaidLootMultiplier reuse, TASK-057 defenderFortificationBonus, TASK-060 stance modifier multipliers), Ship the entity's primitive; leave iteration / scheduling to the task that owns the collection (TASK-056 raid resolver vs orchestrator, TASK-060 stance tracker vs orchestrator), Trim consumer-specific fields off save-format registries (TASK-057 BuildingDefinition omits defenseBonus, TASK-060 stance/action enums omit consumer-axis fields), Relational invariants over literal numbers in balance-tunable registry tests (TASK-052 price-shock direction-sign + step-divisibility, TASK-056 phantom > non-phantom on identical victim, TASK-057 fortification ladder + cost ladder + stroke-width ladder, TASK-060 KRAKEN_STIR + PALE_WATCH stance orderings), Pure-sibling module pattern for Phaser game code + the React-component variant (TASK-051 routes-math.ts + route-layout.ts, TASK-057 colony-fortification.ts), Map/Set-backed save-format emitters sort entries in toJSON for byte-parity determinism (TASK-056 alphabetical resource-event order, TASK-060 sorted toJSON).

Single-entry candidates considered + deferred per the ≥ 2-entry bar: (a) TASK-056's "Discriminated-union outcome with state-equivalent-but-semantically-distinct cases — 'empty-target' vs 'success' with no loot" — clean codifiable rule but only one instance in this window; (b) TASK-052's "Content table carries a redundant `direction: 'spike'|'crash'` label even though `Math.sign(volumeDelta)` encodes the same — narrative copy needs the label, CI invariant pins drift" — interesting counterweight to "Trim consumer-specific fields" but only one instance; (c) TASK-051's "Merge main into the feature branch (NOT rebase) when PR comes up BEHIND — non-destructive, squash-merge collapses the merge commit" — actionable workflow guidance and demonstrably worth pinning (this run rebased instead) but only one instance and arguably belongs in `.claude/skills/autonomous-run.md` Step 9/10 rather than CLAUDE.md; (d) TASK-056's "Faction validation degrades gracefully via `isPlayableFactionId(faction)` for non-playable factions — default rather than throw at the system seam" — clean rule but single entry.

Healthy outcome: the existing rule set is doing its job — five tasks landed without a single new gotcha. No PR opened.

---

## Review [2026-04-24 00:45] — after TASK-061 through TASK-069
- Success streak: 4 since last REVIEW-LOG entry at 2026-04-23 14:30 (which covered TASK-051…TASK-060); raw trailing success run in AGENT-LOG is 9 but the prior review sits inside it.
- Patterns identified: n/a (gate not crossed)
- Proposals drafted: 0
- Proposals de-duplicated: 0
- Refinements committed: 0
- PR: n/a
- Outcome: skipped-below-threshold
- Files touched: none

`/autonomous-run` Step 15 invoked this skill after the raw trailing-success count crossed 5, but per the skill contract "No REVIEW-LOG entry exists within that window" is the second gate: the 2026-04-23 14:30 REVIEW-LOG entry is *inside* the trailing-5 window (covers TASK-060 at position 5-from-the-tail). Post-review net streak is only 4 runs (TASK-061, TASK-062, TASK-068, TASK-069) — below the five-success threshold. Returning without opening a PR so the next cycle (TASK-0XX) re-evaluates on a clean post-review window.

For next cycle's reference: the emerging cross-cutting pattern is the **slice-driven self-mounting event modal** applied a third, fourth, and fifth time this post-review window (TASK-062 BlackMarketModal, TASK-068 TithePaymentModal, TASK-069 TidewaterPartyModal) — already fully codified in `.claude/notes/ui-screens.md`, so the canonical-examples list is stale but the *rule* is not net-new.

