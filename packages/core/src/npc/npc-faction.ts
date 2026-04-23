// NPC (non-playable, encounter-only) faction templates — the four
// canonical Forsaken / Crimson-Tide-adjacent factions that appear in
// the world as fixed-behaviour encounters rather than as diplomatic
// entities. Per MVP scope (CLAUDE.md):
//
//   - Pale Watch           — Abyssal-site guardians. Intervene when the
//                             sites are disturbed.
//   - Abyssal Brotherhood  — cult. Opportunistic raiders.
//   - Blackwater Collective — smugglers. Intercept trade lanes.
//   - Sons of Scylla       — Scylla-worshipping guerrillas. Ambushers.
//
// Each template carries a declarative spawn trigger and encounter
// behaviour. Per CLAUDE.md "Ship the entity's primitive; leave
// iteration / scheduling to the task that owns the collection." —
// this module registers the templates + type guards. The spawn
// orchestrator (per-turn / map-scan), the encounter resolver
// (combat / raid / intervention flows), and the AI loop each query
// this module by id and apply their own semantics.
//
// NPC factions are categorically non-diplomatic. `NpcFactionId` is a
// union disjoint from `PlayableFactionId` — the diplomacy resolver
// short-circuits before touching an NPC target because no NPC id is
// ever a valid `PlayableFactionId`. A cross-module test pins the
// disjointness.
//
// Duplication note: `NpcFactionId` is also mirrored in
// `@colonize/content/npc-factions.ts` for flavour copy (name, summary,
// tone register). The dependency-direction rule forbids content
// importing core and vice versa, so the two string unions are pinned
// independently by sibling tests in each package — matching the
// `PlayableFactionId` / `AbyssalStanceId` pattern.

export type NpcFactionId = 'pale-watch' | 'abyssal-brotherhood' | 'blackwater' | 'sons-of-scylla';

export const ALL_NPC_FACTION_IDS: readonly NpcFactionId[] = [
  'pale-watch',
  'abyssal-brotherhood',
  'blackwater',
  'sons-of-scylla',
];

export function isNpcFactionId(value: unknown): value is NpcFactionId {
  return typeof value === 'string' && (ALL_NPC_FACTION_IDS as readonly string[]).includes(value);
}

// Declarative spawn triggers a future orchestrator reads to decide
// when / where to materialise an encounter. Kept as a small
// enumerated vocabulary rather than a free-form predicate so the
// scheduler can pattern-match without a per-faction lookup.
export const NpcSpawnTrigger = {
  // Drawn by Abyssal-site proximity — either to guard it or to
  // scavenge / ritualise at it.
  AbyssalSiteProximity: 'abyssal-site-proximity',
  // Drawn by merchant / supply traffic — the smuggler's intercept
  // pattern.
  TradeLaneIntercept: 'trade-lane-intercept',
  // Drawn by open-ocean / deep-water tiles tied to an Abyssal Horror
  // patron — the Scylla-venerating guerrilla pattern.
  DeepWaterPatron: 'deep-water-patron',
} as const;

export type NpcSpawnTrigger = (typeof NpcSpawnTrigger)[keyof typeof NpcSpawnTrigger];

export const ALL_NPC_SPAWN_TRIGGERS: readonly NpcSpawnTrigger[] = [
  NpcSpawnTrigger.AbyssalSiteProximity,
  NpcSpawnTrigger.TradeLaneIntercept,
  NpcSpawnTrigger.DeepWaterPatron,
];

export function isNpcSpawnTrigger(value: unknown): value is NpcSpawnTrigger {
  return typeof value === 'string' && (ALL_NPC_SPAWN_TRIGGERS as readonly string[]).includes(value);
}

// Declarative encounter behaviours that the encounter resolver
// dispatches on. One per NPC archetype — the minimal AI the MVP
// requires; the canonical list mirrors the four factions registered
// below.
export const NpcEncounterBehaviour = {
  // Intervene only when Abyssal sites are disturbed; otherwise stand
  // off. Pale-Watch pattern — aggression gated on trespass, never
  // opportunistic.
  InterveneOnDisturbance: 'intervene-on-disturbance',
  // Hostile when favourable, retreat otherwise. Abyssal-Brotherhood
  // pattern — cult-raiders probing for weakness.
  OpportunisticAggression: 'opportunistic-aggression',
  // Attack to strip cargo from merchant / supply traffic. Blackwater
  // pattern — smuggler-raid loop.
  RaidSupplyLine: 'raid-supply-line',
  // Surprise-attack posture — first-strike, multi-pronged. Sons-of-
  // Scylla pattern.
  Ambush: 'ambush',
} as const;

export type NpcEncounterBehaviour =
  (typeof NpcEncounterBehaviour)[keyof typeof NpcEncounterBehaviour];

export const ALL_NPC_ENCOUNTER_BEHAVIOURS: readonly NpcEncounterBehaviour[] = [
  NpcEncounterBehaviour.InterveneOnDisturbance,
  NpcEncounterBehaviour.OpportunisticAggression,
  NpcEncounterBehaviour.RaidSupplyLine,
  NpcEncounterBehaviour.Ambush,
];

export function isNpcEncounterBehaviour(value: unknown): value is NpcEncounterBehaviour {
  return (
    typeof value === 'string' && (ALL_NPC_ENCOUNTER_BEHAVIOURS as readonly string[]).includes(value)
  );
}

export interface NpcFactionTemplate {
  readonly id: NpcFactionId;
  // Trigger the spawn orchestrator reads when deciding where to
  // materialise this faction.
  readonly spawnTrigger: NpcSpawnTrigger;
  // Fixed behaviour the encounter resolver dispatches on. "Fixed"
  // per MVP spec — no per-faction AI state machine yet.
  readonly encounterBehaviour: NpcEncounterBehaviour;
}

export const NPC_FACTION_TEMPLATES: Readonly<Record<NpcFactionId, NpcFactionTemplate>> = {
  'pale-watch': {
    id: 'pale-watch',
    spawnTrigger: NpcSpawnTrigger.AbyssalSiteProximity,
    encounterBehaviour: NpcEncounterBehaviour.InterveneOnDisturbance,
  },
  'abyssal-brotherhood': {
    id: 'abyssal-brotherhood',
    spawnTrigger: NpcSpawnTrigger.AbyssalSiteProximity,
    encounterBehaviour: NpcEncounterBehaviour.OpportunisticAggression,
  },
  blackwater: {
    id: 'blackwater',
    spawnTrigger: NpcSpawnTrigger.TradeLaneIntercept,
    encounterBehaviour: NpcEncounterBehaviour.RaidSupplyLine,
  },
  'sons-of-scylla': {
    id: 'sons-of-scylla',
    spawnTrigger: NpcSpawnTrigger.DeepWaterPatron,
    encounterBehaviour: NpcEncounterBehaviour.Ambush,
  },
};

export function getNpcFactionTemplate(id: NpcFactionId): NpcFactionTemplate {
  switch (id) {
    case 'pale-watch':
    case 'abyssal-brotherhood':
    case 'blackwater':
    case 'sons-of-scylla':
      return NPC_FACTION_TEMPLATES[id];
  }
}
