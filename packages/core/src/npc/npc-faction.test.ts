import { describe, it, expect } from 'vitest';
import {
  ALL_NPC_ENCOUNTER_BEHAVIOURS,
  ALL_NPC_FACTION_IDS,
  ALL_NPC_SPAWN_TRIGGERS,
  NPC_FACTION_TEMPLATES,
  NpcEncounterBehaviour,
  NpcSpawnTrigger,
  getNpcFactionTemplate,
  isNpcEncounterBehaviour,
  isNpcFactionId,
  isNpcSpawnTrigger,
  type NpcFactionId,
} from './npc-faction.js';
import { ALL_PLAYABLE_FACTION_IDS } from '../faction/index.js';

const CANONICAL_IDS: readonly NpcFactionId[] = [
  'pale-watch',
  'abyssal-brotherhood',
  'blackwater',
  'sons-of-scylla',
];

describe('NpcSpawnTrigger', () => {
  it('const-object literal values are the stable wire strings', () => {
    expect(NpcSpawnTrigger.AbyssalSiteProximity).toBe('abyssal-site-proximity');
    expect(NpcSpawnTrigger.TradeLaneIntercept).toBe('trade-lane-intercept');
    expect(NpcSpawnTrigger.DeepWaterPatron).toBe('deep-water-patron');
  });

  it('ALL_NPC_SPAWN_TRIGGERS contains every canonical trigger without duplicates', () => {
    expect(new Set(ALL_NPC_SPAWN_TRIGGERS).size).toBe(ALL_NPC_SPAWN_TRIGGERS.length);
    expect(ALL_NPC_SPAWN_TRIGGERS).toContain(NpcSpawnTrigger.AbyssalSiteProximity);
    expect(ALL_NPC_SPAWN_TRIGGERS).toContain(NpcSpawnTrigger.TradeLaneIntercept);
    expect(ALL_NPC_SPAWN_TRIGGERS).toContain(NpcSpawnTrigger.DeepWaterPatron);
  });

  it('isNpcSpawnTrigger narrows every canonical value', () => {
    for (const value of ALL_NPC_SPAWN_TRIGGERS) {
      expect(isNpcSpawnTrigger(value)).toBe(true);
    }
  });

  it('isNpcSpawnTrigger rejects unknowns and non-strings', () => {
    expect(isNpcSpawnTrigger('ABYSSAL-SITE-PROXIMITY')).toBe(false);
    expect(isNpcSpawnTrigger('harbour-raid')).toBe(false);
    expect(isNpcSpawnTrigger(null)).toBe(false);
    expect(isNpcSpawnTrigger(undefined)).toBe(false);
    expect(isNpcSpawnTrigger(0)).toBe(false);
  });
});

describe('NpcEncounterBehaviour', () => {
  it('const-object literal values are the stable wire strings', () => {
    expect(NpcEncounterBehaviour.InterveneOnDisturbance).toBe('intervene-on-disturbance');
    expect(NpcEncounterBehaviour.OpportunisticAggression).toBe('opportunistic-aggression');
    expect(NpcEncounterBehaviour.RaidSupplyLine).toBe('raid-supply-line');
    expect(NpcEncounterBehaviour.Ambush).toBe('ambush');
  });

  it('ALL_NPC_ENCOUNTER_BEHAVIOURS contains every canonical behaviour without duplicates', () => {
    expect(new Set(ALL_NPC_ENCOUNTER_BEHAVIOURS).size).toBe(ALL_NPC_ENCOUNTER_BEHAVIOURS.length);
    for (const value of Object.values(NpcEncounterBehaviour)) {
      expect(ALL_NPC_ENCOUNTER_BEHAVIOURS).toContain(value);
    }
  });

  it('isNpcEncounterBehaviour narrows every canonical value', () => {
    for (const value of ALL_NPC_ENCOUNTER_BEHAVIOURS) {
      expect(isNpcEncounterBehaviour(value)).toBe(true);
    }
  });

  it('isNpcEncounterBehaviour rejects unknowns and non-strings', () => {
    expect(isNpcEncounterBehaviour('AMBUSH')).toBe(false);
    expect(isNpcEncounterBehaviour('negotiate')).toBe(false);
    expect(isNpcEncounterBehaviour(null)).toBe(false);
    expect(isNpcEncounterBehaviour(42)).toBe(false);
  });
});

describe('ALL_NPC_FACTION_IDS', () => {
  it('includes the four canonical MVP NPC factions', () => {
    expect([...ALL_NPC_FACTION_IDS].sort()).toEqual([...CANONICAL_IDS].sort());
  });

  it('has unique ids', () => {
    expect(new Set(ALL_NPC_FACTION_IDS).size).toBe(ALL_NPC_FACTION_IDS.length);
  });

  it('is disjoint from the playable faction id union', () => {
    // Per MVP spec: NPC factions are not diplomatic entities. The
    // categorical rule is enforced by keeping the two id unions
    // disjoint — the diplomacy resolver's `isPlayableFactionId` guard
    // short-circuits every NPC id for free.
    for (const npcId of ALL_NPC_FACTION_IDS) {
      expect(ALL_PLAYABLE_FACTION_IDS as readonly string[]).not.toContain(npcId);
    }
  });
});

describe('isNpcFactionId', () => {
  it('returns true for every canonical id', () => {
    for (const id of CANONICAL_IDS) {
      expect(isNpcFactionId(id)).toBe(true);
    }
  });

  it('returns false for unknowns, wrong case, and non-strings', () => {
    expect(isNpcFactionId('PALE-WATCH')).toBe(false);
    expect(isNpcFactionId('pale watch')).toBe(false);
    expect(isNpcFactionId('scarlet-forge')).toBe(false);
    expect(isNpcFactionId('otk')).toBe(false);
    expect(isNpcFactionId('')).toBe(false);
    expect(isNpcFactionId(null)).toBe(false);
    expect(isNpcFactionId(undefined)).toBe(false);
    expect(isNpcFactionId(0)).toBe(false);
  });
});

describe('NPC_FACTION_TEMPLATES', () => {
  it('has one template per canonical id', () => {
    const registeredIds = Object.keys(NPC_FACTION_TEMPLATES).sort();
    expect(registeredIds).toEqual([...CANONICAL_IDS].sort());
    for (const id of CANONICAL_IDS) {
      expect(NPC_FACTION_TEMPLATES[id].id).toBe(id);
    }
  });

  it('every template has a registered spawnTrigger and encounterBehaviour', () => {
    for (const id of CANONICAL_IDS) {
      const template = NPC_FACTION_TEMPLATES[id];
      expect(isNpcSpawnTrigger(template.spawnTrigger)).toBe(true);
      expect(isNpcEncounterBehaviour(template.encounterBehaviour)).toBe(true);
    }
  });

  it('every spawn trigger is used by at least one template', () => {
    const used = new Set(CANONICAL_IDS.map((id) => NPC_FACTION_TEMPLATES[id].spawnTrigger));
    for (const trigger of ALL_NPC_SPAWN_TRIGGERS) {
      expect(used).toContain(trigger);
    }
  });

  it('every encounter behaviour is used by exactly one template (1:1 archetype mapping)', () => {
    const counts = new Map<string, number>();
    for (const id of CANONICAL_IDS) {
      const behaviour = NPC_FACTION_TEMPLATES[id].encounterBehaviour;
      counts.set(behaviour, (counts.get(behaviour) ?? 0) + 1);
    }
    for (const behaviour of ALL_NPC_ENCOUNTER_BEHAVIOURS) {
      expect(counts.get(behaviour)).toBe(1);
    }
  });

  it('pins the lore-grounded per-faction template identities', () => {
    // Pale Watch guards Abyssal sites — aggression only on trespass.
    expect(NPC_FACTION_TEMPLATES['pale-watch'].spawnTrigger).toBe(
      NpcSpawnTrigger.AbyssalSiteProximity,
    );
    expect(NPC_FACTION_TEMPLATES['pale-watch'].encounterBehaviour).toBe(
      NpcEncounterBehaviour.InterveneOnDisturbance,
    );

    // Abyssal Brotherhood haunts Abyssal sites but attacks
    // opportunistically, not reactively.
    expect(NPC_FACTION_TEMPLATES['abyssal-brotherhood'].spawnTrigger).toBe(
      NpcSpawnTrigger.AbyssalSiteProximity,
    );
    expect(NPC_FACTION_TEMPLATES['abyssal-brotherhood'].encounterBehaviour).toBe(
      NpcEncounterBehaviour.OpportunisticAggression,
    );

    // Blackwater intercepts trade lanes to strip cargo.
    expect(NPC_FACTION_TEMPLATES['blackwater'].spawnTrigger).toBe(
      NpcSpawnTrigger.TradeLaneIntercept,
    );
    expect(NPC_FACTION_TEMPLATES['blackwater'].encounterBehaviour).toBe(
      NpcEncounterBehaviour.RaidSupplyLine,
    );

    // Sons of Scylla strike from deep water in ambush.
    expect(NPC_FACTION_TEMPLATES['sons-of-scylla'].spawnTrigger).toBe(
      NpcSpawnTrigger.DeepWaterPatron,
    );
    expect(NPC_FACTION_TEMPLATES['sons-of-scylla'].encounterBehaviour).toBe(
      NpcEncounterBehaviour.Ambush,
    );
  });
});

describe('getNpcFactionTemplate', () => {
  it('returns the template for every canonical id', () => {
    for (const id of CANONICAL_IDS) {
      const template = getNpcFactionTemplate(id);
      expect(template.id).toBe(id);
      expect(template).toBe(NPC_FACTION_TEMPLATES[id]);
    }
  });
});
