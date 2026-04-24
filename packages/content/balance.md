# Balance — target win-times & difficulty envelopes

Design targets for the four MVP victory paths and the MVP loss conditions
(STORY-42). This document pins the **intended** turn-count envelopes so
future playtest evidence can be compared against a fixed bar. It is not
a rulebook — the authoritative numbers live in the code registries
linked below, and any tune that drifts far from the envelopes here
should update this doc in the same PR.

Applies to single-player MVP at launch. Multiplayer balance is out of
scope until the post-MVP expansion.

## Design principles

1. **Reachable but not trivial.** Every victory path should be winnable
   by a player who understands the core loop and commits to one
   strategy. None should be winnable by drift or accident.
2. **Standard difficulty is the benchmark.** Win-time envelopes below
   use Standard as the reference; Pacified compresses by ~40 %, Brutal
   stretches by ~50 %.
3. **Faction-agnostic for MVP.** Per-faction threshold overrides are
   deliberately deferred. All four playable factions share the same
   ladder so tuning feedback converges before per-faction variance is
   introduced. Per-faction coefficients land post-MVP.
4. **Engine ships the primitive; balance ships the numbers.** Victory
   predicates are pure functions in `packages/core`; the numeric
   thresholds feeding them live in scalar registries. This doc tracks
   the numbers. See
   [CLAUDE.md § "Ship the entity's primitive"](../../CLAUDE.md).

Game-year convention: NW 2191 is year 0. Unless stated otherwise, a
game turn corresponds to roughly one game-month; a game-year is ~12
turns. All envelopes below are in turns.

## Victory paths

The four STORY-42 paths, their current implementation status, and
target win-time envelopes at Standard difficulty.

| Path        | Fiction                                         | Status   | Target win-turn (Standard) | Fastest (Pacified) | Longest (Brutal) |
| ----------- | ----------------------------------------------- | -------- | -------------------------: | -----------------: | ---------------: |
| Sovereignty | Survive the Concord Fleet punitive campaign.    | **Live** |                  140 – 180 |          100 – 130 |        180 – 240 |
| Prosperity  | Accumulate a treasury + trade-volume threshold. | Planned  |                  160 – 200 |          110 – 150 |        210 – 280 |
| Discovery   | Chart & catalogue the Deep/Sky frontier maps.   | Planned  |                  180 – 220 |          130 – 170 |        230 – 300 |
| Conquest    | Reduce all rival playable factions.             | Planned  |                  200 – 260 |          150 – 200 |        280 – 360 |

The envelope widths bake in ~15 – 20 % tolerance — playtests that land
inside the band are "on target"; drift outside triggers a tune.

### Sovereignty (live)

Only path currently wired into the endgame engine.

Trigger: player invokes **Declare Sovereignty** once the gate opens, the
Concord Fleet spawns, and the player survives `turnsRequired` campaign
turns. Formal victory-condition check is in
[`packages/core/src/endgame/endgame.ts`](../core/src/endgame/endgame.ts).

Gate predicate: [`sovereigntyTriggerStatus`](../core/src/concord/sovereignty-trigger.ts)
with `DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS`:

| Knob               | Current | Intent                                                               |
| ------------------ | ------: | -------------------------------------------------------------------- |
| `minimumYear`      |      10 | Player has ~120 turns to build up before the path opens at all.      |
| `tensionThreshold` |     100 | Matches the ultimatum tier — "strike first the turn they ultimatum." |
| `charterThreshold` |       3 | Political-legitimacy alternate path. 3 of 20 charters = ~3 drafts.   |

Pacified / Standard / Brutal difficulty levers, from
[`packages/content/src/concord-campaign.ts`](./src/concord-campaign.ts):

| Difficulty | `turnsRequired` | Waves | Heaviest wave     | Gate-to-win floor |
| ---------- | --------------: | ----: | ----------------- | ----------------: |
| Pacified   |              12 |     3 | 1× frigate + brig |     ~132 turns \* |
| Standard   |              20 |     5 | 1× SOL + frigate  |     ~140 turns \* |
| Brutal     |              30 |     7 | 2× SOL            |     ~150 turns \* |

\* Floor = (minimumYear × 12) + turnsRequired. Assumes player hits the
year-10 gate immediately and wins the campaign without a miss.

### Prosperity (planned)

Accumulate a standing treasury AND sustained trade-turnover threshold.
Not yet wired into the engine. **Target shape** (pin down when the
predicate lands):

- Standing treasury ≥ 100 000 coins (scales per difficulty).
- Trailing-12-turn trade revenue ≥ 8 000 / turn (rolling average).
- Both conditions held simultaneously for 4 consecutive turns (can't
  flash-cross with a single sell).

Envelope 160 – 200 turns places Prosperity slightly slower than
Sovereignty — the Concord hate it when you build an economy, so tension
accrual competes with treasury growth.

### Discovery (planned)

Charter & catalogue the NW frontier. Not yet wired. **Target shape**:

- Cartographers' Bond or equivalent charter in pouch.
- ≥ 75 % of "Deep Drift" and "Sky Rim" tile-layer discoveries logged.
- A codex-completion secondary gate (prevents lat/long grind without
  meaningful engagement with the codex).

Envelope 180 – 220 turns. Discovery is the slowest live-game path by
design — the player is trading direct conflict for exploration.

### Conquest (planned)

Reduce or vassalise the other three playable factions (Ironclad
Syndicate, Phantom Corsairs, Bloodborne Legion when Order of the Kraken
is the protagonist; permute per starting faction). Not yet wired.
**Target shape**:

- Every rival playable faction reduced to zero colonies.
- Tithe-tension does NOT auto-trigger Sovereignty during the conquest
  run — Conquest wins take precedence once achievable.

Envelope 200 – 260 turns reflects the practical reality that this path
demands the largest military footprint + longest campaign.

## Loss conditions

The engine currently recognises one defeat state; two more are flagged
by STORY-42 but deferred to a follow-up task.

| Loss         | Trigger                                                 | Status   | Target time-to-loss (Standard) |
| ------------ | ------------------------------------------------------- | -------- | -----------------------------: |
| Annihilation | `colonyCount === 0 AND fleetCount === 0`                | **Live** |              90 – 130 turns \* |
| Bankruptcy   | Treasury ≤ 0 for 4 consecutive turns.                   | Planned  |                    70 – 110 \* |
| Capital lost | Capital colony captured AND not retaken within 8 turns. | Planned  |                    80 – 120 \* |

\* Target time-to-loss = "a player who is failing should see the
game-over screen at roughly this turn." Faster than that and losses
feel unsalvageable; slower and they feel drawn-out. The annihilation
check fires in [`checkEndgame`](../core/src/endgame/endgame.ts).

## Knobs — where the numbers live

- **Sovereignty gate** — `DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS` in
  [`packages/core/src/concord/sovereignty-trigger.ts`](../core/src/concord/sovereignty-trigger.ts).
- **Concord escalation ladder** — `CONCORD_TENSION_THRESHOLDS` in
  [`packages/core/src/concord/concord-registry.ts`](../core/src/concord/concord-registry.ts).
- **Tithe rates** — `DEFAULT_TITHE_RATES` in the same registry; feeds
  tension-accrual velocity and therefore Sovereignty-path pace.
- **Concord Fleet difficulty catalogue** —
  [`packages/content/src/concord-campaign.ts`](./src/concord-campaign.ts).
- **Victory/loss predicate** —
  [`packages/core/src/endgame/endgame.ts`](../core/src/endgame/endgame.ts).
- **Ad cadence (turn-end interstitial)** — `AD_CADENCE_BY_GAME_LENGTH` in
  [`packages/core/src/ads/cadence.ts`](../core/src/ads/cadence.ts). Per
  `GameLength` preset; Standard is the reference. Paired with the in-shell
  guard (`apps/web/src/ads/ads-guard.ts`) that blocks interstitials during
  Sovereignty Wars, combat, tutorial, and transient narrative modals.

## Ad cadence envelopes

Per-turn interstitial pacing (TASK-085). The orchestrator in
`apps/web/src/ads/ad-orchestrator.ts` attempts an ad every N turns; the
cadence skips when the guard (`evaluateAdGuard`) blocks, and stamps
`lastAdShowTurn` only on a successful `shown` outcome so blocked turns
retry rather than drifting forward.

| GameLength | `cadenceN` (turns) | Rationale                                                                     |
| ---------- | -----------------: | ----------------------------------------------------------------------------- |
| Short      |                  6 | Compressed runs still see ~1 interstitial per in-game year (12 turns).        |
| Standard   |                 10 | Task default. Roughly one ad per ~10 turns of active play.                    |
| Long       |                 15 | A 200-turn Conquest endgame caps at ~13 ads — not a drumbeat every few turns. |

Ordering invariant (tested via relational-invariant test in
`packages/core/src/ads/cadence.test.ts`): `short < standard < long`. Specific
numbers above are tunable; the ordering is a design constraint — a shorter
run must not see ads less often than a longer one.

No `GameLength` UI ships in the MVP yet; the orchestrator defaults to
`DEFAULT_GAME_LENGTH = 'standard'`. A settings-side task will route a
player-chosen preset through `initAdOrchestrator({ gameLength })` once the
selector lands.

Tests that pin the **shape** (ordering, non-emptiness, symbolic
threshold references) but intentionally do **not** pin concrete
numbers:

- `packages/core/src/concord/concord-registry.test.ts` — ladder is
  ascending + non-empty; "the concrete value is tuned in TASK-073."
- `packages/core/src/concord/sovereignty-trigger.test.ts` — all
  threshold assertions go through the `DEFAULTS` symbol, so tuning a
  default does not cascade into test churn.

Changing a number here without also updating this document is a
drift-in-progress — the next playtest comparison has nothing to
measure against.

## TASK-073 outcome

This pass confirmed the current ladder against the envelopes above and
left the shipped numbers untouched:

- The sovereignty-gate trio (`minimumYear: 10`, `tensionThreshold: 100`,
  `charterThreshold: 3`) each map to a clearly-scoped design intent
  (build-up runway / "strike the turn they ultimatum" / political
  alternate). No isolated knob is out-of-band by inspection.
- The three campaign presets (`turnsRequired: 12 / 20 / 30`) hit the
  Standard 140 – 180 envelope with room at both ends for Pacified and
  Brutal.
- The three planned paths (Prosperity, Discovery, Conquest) get target
  envelopes here; the engine task that lands each predicate must hit
  them or amend this doc with playtest evidence.
- Annihilation is binary and non-tunable; Bankruptcy + Capital-lost
  pick up their target time-to-loss windows when the predicates ship.

Open for the next balance pass (evidence-driven, after the three
planned paths are wired):

1. Does `charterThreshold: 3` feel too easy once the full 20-charter
   pool is in rotation? Candidate tune: 4 – 5 if playtests close the
   political route inside the first 60 turns post-gate.
2. Does the Brutal campaign's 7-wave schedule clear its 30-turn floor
   in practice, or does the final SOL spawn at turn 24 compress the
   attrition window too aggressively?
3. Does tithe-tension accrue fast enough that the Sovereignty path
   opens for players who are _not_ chasing it? The `yearScale: 0.05`
   lever in `DEFAULT_TITHE_RATES` is the first knob to revisit.
