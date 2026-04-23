// resolveRaid — pure resolver for a privateer raid against a ship.
//
// Mechanic: a Privateer ambushing a tile may raid a hostile ship that
// passes through. Cargo is stolen (transferred to the privateer's hold);
// the victim's hull is unharmed. An escort on-scene blocks the raid
// entirely — combat between privateer and escort, if it follows, is the
// combat resolver's domain.
//
// Per CLAUDE.md "Ship the entity's primitive; leave iteration / scheduling
// to the task that owns the collection": this resolver takes the two
// ships involved + an explicit `escortPresent` flag and resolves a single
// raid event. The orchestrator (a future task) iterates units, decides
// which privateer is ambushing which merchant on which tile, and calls
// this once per raid. No ambush state is stored in core — position +
// orchestrator policy supplies it.
//
// Per CLAUDE.md "Scalar seams for pre-registry axis values": the base
// loot fraction (0.5) is a constant of the rule, but the per-faction
// multiplier is read from `factionRaidLootMultiplier`, so Phantom Corsairs'
// +50% bonus (effective 0.75 fraction) flows through without this module
// owning the bonus table.
//
// Resource theft is fractional and floored: stolen = floor(qty * fraction),
// capped at qty. Sub-unit fractions (qty=1 with 0.5 fraction → floor=0)
// leave the resource intact, which the call site treats as a failed steal
// rather than an error. Artifacts are unique items, not fungible — every
// artifact in the victim's hold transfers in full.

import { factionRaidLootMultiplier, isPlayableFactionId } from '../faction/faction-bonus.js';
import { isShipUnitType, UnitType } from '../unit/unit-type.js';
import type { Unit } from '../unit/unit.js';
import type { RaidEvent, RaidOutcome, RaidResult } from './raid-outcome.js';

export interface ResolveRaidOpts {
  readonly escortPresent: boolean;
}

export const BASE_RAID_LOOT_FRACTION = 0.5;

export function resolveRaid(privateer: Unit, victim: Unit, opts: ResolveRaidOpts): RaidOutcome {
  if (privateer.type !== UnitType.Privateer) {
    throw new TypeError(`resolveRaid: attacker must be a Privateer (got "${privateer.type}")`);
  }
  if (!isShipUnitType(victim.type)) {
    throw new TypeError(`resolveRaid: victim must be a ship type (got "${victim.type}")`);
  }
  if (privateer === victim) {
    throw new Error('resolveRaid: cannot raid self');
  }
  if (privateer.faction === victim.faction) {
    throw new Error(`resolveRaid: cannot raid same-faction ship (faction "${privateer.faction}")`);
  }
  if (typeof opts !== 'object' || opts === null) {
    throw new TypeError('resolveRaid: opts must be an object');
  }
  if (typeof opts.escortPresent !== 'boolean') {
    throw new TypeError('resolveRaid: opts.escortPresent must be a boolean');
  }

  if (opts.escortPresent) {
    return {
      result: 'blocked-by-escort',
      loot: { resources: {}, artifacts: [] },
      events: [{ kind: 'raid-blocked-by-escort' }],
    };
  }

  const fraction = effectiveLootFraction(privateer.faction);
  const events: RaidEvent[] = [];
  const stolenResources: Record<string, number> = {};
  const stolenArtifacts: string[] = [];

  // Snapshot resources before mutating; sort by id for deterministic event
  // ordering across machines (orchestrators may replay raid logs).
  const resourceSnapshot = [...victim.cargo.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [id, qty] of resourceSnapshot) {
    const stolen = Math.min(qty, Math.floor(qty * fraction));
    if (stolen <= 0) continue;
    victim.cargo.removeResource(id, stolen);
    privateer.cargo.addResource(id, stolen);
    stolenResources[id] = stolen;
    events.push({ kind: 'cargo-stolen', resourceId: id, stolenQty: stolen });
  }

  // `cargo.artifacts` already returns a sorted defensive copy.
  for (const artifactId of victim.cargo.artifacts) {
    victim.cargo.removeArtifact(artifactId);
    privateer.cargo.addArtifact(artifactId);
    stolenArtifacts.push(artifactId);
    events.push({ kind: 'artifact-stolen', artifactId });
  }

  let result: RaidResult;
  if (Object.keys(stolenResources).length === 0 && stolenArtifacts.length === 0) {
    result = 'empty-target';
    events.push({ kind: 'raid-empty-target' });
  } else {
    result = 'success';
  }

  return {
    result,
    loot: { resources: stolenResources, artifacts: stolenArtifacts },
    events,
  };
}

function effectiveLootFraction(faction: string): number {
  if (isPlayableFactionId(faction)) {
    return BASE_RAID_LOOT_FRACTION * factionRaidLootMultiplier(faction);
  }
  return BASE_RAID_LOOT_FRACTION;
}
