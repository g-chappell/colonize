import { describe, expect, it } from 'vitest';
import { Unit } from '../unit/unit.js';
import { UnitType } from '../unit/unit-type.js';
import { BASE_RAID_LOOT_FRACTION, resolveRaid } from './resolve-raid.js';

function makePrivateer(faction: string, id = 'p1'): Unit {
  return new Unit({
    id,
    faction,
    position: { x: 0, y: 0 },
    type: UnitType.Privateer,
  });
}

function makeMerchant(
  faction: string,
  cargo: { resources?: Record<string, number>; artifacts?: readonly string[] } = {},
  id = 'm1',
): Unit {
  return new Unit({
    id,
    faction,
    position: { x: 0, y: 0 },
    type: UnitType.Sloop,
    cargo,
  });
}

describe('resolveRaid — success path (no escort, neutral faction)', () => {
  it('steals floor(qty * 0.5) of each resource and leaves the rest', () => {
    const privateer = makePrivateer('ironclad');
    const victim = makeMerchant('otk', { resources: { timber: 4, provisions: 6, gold: 1 } });

    const outcome = resolveRaid(privateer, victim, { escortPresent: false });

    expect(outcome.result).toBe('success');
    expect(outcome.loot.resources).toEqual({ timber: 2, provisions: 3 });
    expect(victim.cargo.getQuantity('timber')).toBe(2);
    expect(victim.cargo.getQuantity('provisions')).toBe(3);
    // gold qty 1 → floor(0.5) = 0 → not stolen
    expect(victim.cargo.getQuantity('gold')).toBe(1);
    expect(privateer.cargo.getQuantity('timber')).toBe(2);
    expect(privateer.cargo.getQuantity('provisions')).toBe(3);
    expect(privateer.cargo.getQuantity('gold')).toBe(0);
  });

  it('emits one cargo-stolen event per resource in alphabetical id order', () => {
    const privateer = makePrivateer('ironclad');
    const victim = makeMerchant('otk', { resources: { timber: 4, gold: 4, provisions: 4 } });

    const outcome = resolveRaid(privateer, victim, { escortPresent: false });
    const stolenIds = outcome.events
      .filter((e) => e.kind === 'cargo-stolen')
      .map((e) => (e.kind === 'cargo-stolen' ? e.resourceId : ''));

    expect(stolenIds).toEqual(['gold', 'provisions', 'timber']);
  });

  it('transfers all artifacts in full (artifacts are non-fractional)', () => {
    const privateer = makePrivateer('ironclad');
    const victim = makeMerchant('otk', { artifacts: ['kraken-talisman', 'tide-shard'] });

    const outcome = resolveRaid(privateer, victim, { escortPresent: false });

    expect(outcome.result).toBe('success');
    expect(outcome.loot.artifacts).toEqual(['kraken-talisman', 'tide-shard']);
    expect(victim.cargo.artifacts).toEqual([]);
    expect(privateer.cargo.artifacts).toEqual(['kraken-talisman', 'tide-shard']);
  });

  it('reports loot fraction of 0.5 for non-Phantom factions', () => {
    expect(BASE_RAID_LOOT_FRACTION).toBe(0.5);
  });
});

describe('resolveRaid — Phantom Corsairs bonus', () => {
  it('steals floor(qty * 0.75) when privateer faction is phantom', () => {
    const privateer = makePrivateer('phantom');
    const victim = makeMerchant('otk', { resources: { timber: 4, provisions: 8, gold: 2 } });

    const outcome = resolveRaid(privateer, victim, { escortPresent: false });

    expect(outcome.loot.resources).toEqual({
      timber: 3, // floor(4 * 0.75) = 3
      provisions: 6, // floor(8 * 0.75) = 6
      gold: 1, // floor(2 * 0.75) = 1
    });
  });

  it('phantom out-loots a non-phantom on the same victim cargo', () => {
    const phantom = makePrivateer('phantom', 'p-phantom');
    const ironclad = makePrivateer('ironclad', 'p-ironclad');
    const victimA = makeMerchant('otk', { resources: { timber: 8 } }, 'm-a');
    const victimB = makeMerchant('otk', { resources: { timber: 8 } }, 'm-b');

    const phantomLoot = resolveRaid(phantom, victimA, { escortPresent: false }).loot.resources;
    const ironcladLoot = resolveRaid(ironclad, victimB, { escortPresent: false }).loot.resources;

    expect(phantomLoot.timber).toBeGreaterThan(ironcladLoot.timber ?? 0);
    expect(phantomLoot.timber).toBe(6);
    expect(ironcladLoot.timber).toBe(4);
  });
});

describe('resolveRaid — escort blocks the raid', () => {
  it('returns blocked-by-escort and does not move any cargo', () => {
    const privateer = makePrivateer('phantom');
    const victim = makeMerchant('otk', {
      resources: { timber: 10 },
      artifacts: ['kraken-talisman'],
    });

    const outcome = resolveRaid(privateer, victim, { escortPresent: true });

    expect(outcome.result).toBe('blocked-by-escort');
    expect(outcome.loot.resources).toEqual({});
    expect(outcome.loot.artifacts).toEqual([]);
    expect(outcome.events).toEqual([{ kind: 'raid-blocked-by-escort' }]);
    expect(victim.cargo.getQuantity('timber')).toBe(10);
    expect(victim.cargo.hasArtifact('kraken-talisman')).toBe(true);
    expect(privateer.cargo.isEmpty).toBe(true);
  });
});

describe('resolveRaid — empty target', () => {
  it('returns empty-target when victim has no cargo', () => {
    const privateer = makePrivateer('ironclad');
    const victim = makeMerchant('otk');

    const outcome = resolveRaid(privateer, victim, { escortPresent: false });

    expect(outcome.result).toBe('empty-target');
    expect(outcome.loot.resources).toEqual({});
    expect(outcome.loot.artifacts).toEqual([]);
    expect(outcome.events).toEqual([{ kind: 'raid-empty-target' }]);
  });

  it('returns empty-target when every resource qty is sub-fractional and no artifacts', () => {
    const privateer = makePrivateer('ironclad');
    const victim = makeMerchant('otk', { resources: { gold: 1, copper: 1 } });

    const outcome = resolveRaid(privateer, victim, { escortPresent: false });

    expect(outcome.result).toBe('empty-target');
    expect(outcome.loot.resources).toEqual({});
    expect(victim.cargo.getQuantity('gold')).toBe(1);
    expect(victim.cargo.getQuantity('copper')).toBe(1);
  });
});

describe('resolveRaid — invariants and validation', () => {
  it('throws when attacker is not a Privateer', () => {
    const sloop = new Unit({
      id: 'not-priv',
      faction: 'ironclad',
      position: { x: 0, y: 0 },
      type: UnitType.Sloop,
    });
    const victim = makeMerchant('otk', { resources: { timber: 4 } });
    expect(() => resolveRaid(sloop, victim, { escortPresent: false })).toThrow(TypeError);
  });

  it('throws when victim is not a ship type', () => {
    const privateer = makePrivateer('ironclad');
    const settler = new Unit({
      id: 'land',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Settler,
    });
    expect(() => resolveRaid(privateer, settler, { escortPresent: false })).toThrow(TypeError);
  });

  it('throws when privateer and victim share a faction', () => {
    const privateer = makePrivateer('phantom');
    const victim = makeMerchant('phantom', { resources: { timber: 2 } });
    expect(() => resolveRaid(privateer, victim, { escortPresent: false })).toThrow(/same-faction/);
  });

  it('throws when raiding self', () => {
    const privateer = makePrivateer('phantom');
    expect(() => resolveRaid(privateer, privateer, { escortPresent: false })).toThrow(/raid self/);
  });

  it('throws on non-boolean escortPresent', () => {
    const privateer = makePrivateer('phantom');
    const victim = makeMerchant('otk', { resources: { timber: 2 } });
    expect(() =>
      resolveRaid(privateer, victim, { escortPresent: 'no' as unknown as boolean }),
    ).toThrow(TypeError);
  });

  it('does not damage victim hull (no hull field is touched)', () => {
    const privateer = makePrivateer('ironclad');
    const victim = makeMerchant('otk', { resources: { timber: 6 } });
    const beforePos = { x: victim.position.x, y: victim.position.y };
    const beforeMov = victim.movement;

    resolveRaid(privateer, victim, { escortPresent: false });

    expect(victim.position).toEqual(beforePos);
    expect(victim.movement).toBe(beforeMov);
  });

  it('non-phantom playable factions all use base 0.5 fraction', () => {
    for (const faction of ['otk', 'ironclad', 'bloodborne']) {
      const privateer = makePrivateer(faction, `p-${faction}`);
      const victim = makeMerchant('phantom', { resources: { timber: 4 } }, `m-${faction}`);
      const outcome = resolveRaid(privateer, victim, { escortPresent: false });
      expect(outcome.loot.resources.timber).toBe(2);
    }
  });

  it('non-playable faction defaults to base 0.5 fraction', () => {
    const privateer = makePrivateer('npc-pirates');
    const victim = makeMerchant('otk', { resources: { timber: 4 } });
    const outcome = resolveRaid(privateer, victim, { escortPresent: false });
    expect(outcome.loot.resources.timber).toBe(2);
  });
});
