// Archive Charter registry — the 20 permanent-bonus charters the Elders
// Council offers, two-at-a-time, at each Liberty-Chime threshold.
//
// A charter is a save-format-bound identifier paired with a typed effect
// delta on a single numeric axis. The axis names the *consumer* system
// (combat morale, recruitment speed, colony production, etc.); the
// scalar delta is the magnitude the consumer reads when it applies the
// effect. Consumer systems do not exist yet — this module ships the
// primitive (id + effect + aggregator) per CLAUDE.md's "Ship the entity's
// primitive; leave iteration / scheduling to the task that owns the
// collection." When the combat orchestrator / recruitment executor /
// production multiplier later lands, it reads `FactionCharters.selected`
// and calls `aggregateCharterEffects` to get its axis sum.
//
// Per CLAUDE.md's "Rule-relevant stats live in `@colonize/core`;
// descriptive / flavour stats live in `@colonize/content`": the id +
// axis + delta live here (save-format-bound, rule-relevant); the
// descriptive name / summary / narrative copy / tone register lives
// next to `@colonize/content/charters.ts`, with a drift guard test on
// each side pinning the two id lists together.
//
// Axes follow the kebab-case convention of other save-format-bound
// string unions (TileType, BuildingType). Add a new axis by adding a
// member to the `CharterBonusAxis` const-object and a case to the
// aggregator's exhaustive switch — consumers surface as compile errors
// until they read the new axis out of the aggregate.

export const CharterBonusAxis = {
  CombatMorale: 'combat-morale',
  RecruitmentSpeed: 'recruitment-speed',
  ColonyProduction: 'colony-production',
  ShipyardCostReduction: 'shipyard-cost-reduction',
  RaidLoot: 'raid-loot',
  TradeMargin: 'trade-margin',
  ExplorationVision: 'exploration-vision',
  ShipSpeed: 'ship-speed',
  DiplomacyPressure: 'diplomacy-pressure',
  RumourYield: 'rumour-yield',
} as const;

export type CharterBonusAxis = (typeof CharterBonusAxis)[keyof typeof CharterBonusAxis];

export const ALL_CHARTER_BONUS_AXES: readonly CharterBonusAxis[] = Object.values(CharterBonusAxis);

export function isCharterBonusAxis(value: unknown): value is CharterBonusAxis {
  return typeof value === 'string' && (ALL_CHARTER_BONUS_AXES as readonly string[]).includes(value);
}

export type ArchiveCharterId = (typeof ArchiveCharterId)[keyof typeof ArchiveCharterId];

export const ArchiveCharterId = {
  PirataCodexFragment: 'pirata-codex-fragment',
  BladeOathParchment: 'blade-oath-parchment',
  BloodlineWrit: 'bloodline-writ',
  PressGangCommission: 'press-gang-commission',
  TidekeepersLedger: 'tidekeepers-ledger',
  ForgeMasterAccord: 'forge-master-accord',
  ShipwrightGuildCharter: 'shipwright-guild-charter',
  SawmillSyndicatePact: 'sawmill-syndicate-pact',
  CorsairMarque: 'corsair-marque',
  PlunderShareWrit: 'plunder-share-writ',
  FreePortCompact: 'free-port-compact',
  CartographersBond: 'cartographers-bond',
  LighthouseKeepersOath: 'lighthouse-keepers-oath',
  AstralSextantWarrant: 'astral-sextant-warrant',
  KrakenWindBlessing: 'kraken-wind-blessing',
  CareenedHullPact: 'careened-hull-pact',
  EnvoysSeal: 'envoys-seal',
  TribunalCharter: 'tribunal-charter',
  ArchivistsOath: 'archivists-oath',
  KelpWitchPact: 'kelp-witch-pact',
} as const;

export interface CharterEffect {
  readonly axis: CharterBonusAxis;
  readonly delta: number;
}

export interface ArchiveCharter {
  readonly id: ArchiveCharterId;
  readonly effect: CharterEffect;
}

const ARCHIVE_CHARTERS_INTERNAL: Readonly<Record<ArchiveCharterId, ArchiveCharter>> = {
  [ArchiveCharterId.PirataCodexFragment]: {
    id: ArchiveCharterId.PirataCodexFragment,
    effect: { axis: CharterBonusAxis.CombatMorale, delta: 5 },
  },
  [ArchiveCharterId.BladeOathParchment]: {
    id: ArchiveCharterId.BladeOathParchment,
    effect: { axis: CharterBonusAxis.CombatMorale, delta: 8 },
  },
  [ArchiveCharterId.BloodlineWrit]: {
    id: ArchiveCharterId.BloodlineWrit,
    effect: { axis: CharterBonusAxis.RecruitmentSpeed, delta: 10 },
  },
  [ArchiveCharterId.PressGangCommission]: {
    id: ArchiveCharterId.PressGangCommission,
    effect: { axis: CharterBonusAxis.RecruitmentSpeed, delta: 15 },
  },
  [ArchiveCharterId.TidekeepersLedger]: {
    id: ArchiveCharterId.TidekeepersLedger,
    effect: { axis: CharterBonusAxis.ColonyProduction, delta: 0.1 },
  },
  [ArchiveCharterId.ForgeMasterAccord]: {
    id: ArchiveCharterId.ForgeMasterAccord,
    effect: { axis: CharterBonusAxis.ColonyProduction, delta: 0.15 },
  },
  [ArchiveCharterId.ShipwrightGuildCharter]: {
    id: ArchiveCharterId.ShipwrightGuildCharter,
    effect: { axis: CharterBonusAxis.ShipyardCostReduction, delta: 0.15 },
  },
  [ArchiveCharterId.SawmillSyndicatePact]: {
    id: ArchiveCharterId.SawmillSyndicatePact,
    effect: { axis: CharterBonusAxis.ShipyardCostReduction, delta: 0.1 },
  },
  [ArchiveCharterId.CorsairMarque]: {
    id: ArchiveCharterId.CorsairMarque,
    effect: { axis: CharterBonusAxis.RaidLoot, delta: 0.25 },
  },
  [ArchiveCharterId.PlunderShareWrit]: {
    id: ArchiveCharterId.PlunderShareWrit,
    effect: { axis: CharterBonusAxis.RaidLoot, delta: 0.4 },
  },
  [ArchiveCharterId.FreePortCompact]: {
    id: ArchiveCharterId.FreePortCompact,
    effect: { axis: CharterBonusAxis.TradeMargin, delta: 0.05 },
  },
  [ArchiveCharterId.CartographersBond]: {
    id: ArchiveCharterId.CartographersBond,
    effect: { axis: CharterBonusAxis.TradeMargin, delta: 0.08 },
  },
  [ArchiveCharterId.LighthouseKeepersOath]: {
    id: ArchiveCharterId.LighthouseKeepersOath,
    effect: { axis: CharterBonusAxis.ExplorationVision, delta: 1 },
  },
  [ArchiveCharterId.AstralSextantWarrant]: {
    id: ArchiveCharterId.AstralSextantWarrant,
    effect: { axis: CharterBonusAxis.ExplorationVision, delta: 2 },
  },
  [ArchiveCharterId.KrakenWindBlessing]: {
    id: ArchiveCharterId.KrakenWindBlessing,
    effect: { axis: CharterBonusAxis.ShipSpeed, delta: 1 },
  },
  [ArchiveCharterId.CareenedHullPact]: {
    id: ArchiveCharterId.CareenedHullPact,
    effect: { axis: CharterBonusAxis.ShipSpeed, delta: 2 },
  },
  [ArchiveCharterId.EnvoysSeal]: {
    id: ArchiveCharterId.EnvoysSeal,
    effect: { axis: CharterBonusAxis.DiplomacyPressure, delta: 10 },
  },
  [ArchiveCharterId.TribunalCharter]: {
    id: ArchiveCharterId.TribunalCharter,
    effect: { axis: CharterBonusAxis.DiplomacyPressure, delta: 15 },
  },
  [ArchiveCharterId.ArchivistsOath]: {
    id: ArchiveCharterId.ArchivistsOath,
    effect: { axis: CharterBonusAxis.RumourYield, delta: 0.25 },
  },
  [ArchiveCharterId.KelpWitchPact]: {
    id: ArchiveCharterId.KelpWitchPact,
    effect: { axis: CharterBonusAxis.RumourYield, delta: 0.5 },
  },
};

export const ARCHIVE_CHARTERS: readonly ArchiveCharter[] = Object.values(ARCHIVE_CHARTERS_INTERNAL);

export const ALL_ARCHIVE_CHARTER_IDS: readonly ArchiveCharterId[] = ARCHIVE_CHARTERS.map(
  (c) => c.id,
);

export function isArchiveCharterId(value: unknown): value is ArchiveCharterId {
  return (
    typeof value === 'string' && (ALL_ARCHIVE_CHARTER_IDS as readonly string[]).includes(value)
  );
}

export function getArchiveCharter(id: ArchiveCharterId): ArchiveCharter {
  if (!isArchiveCharterId(id)) {
    throw new TypeError(`getArchiveCharter: not a valid ArchiveCharterId: ${String(id)}`);
  }
  return ARCHIVE_CHARTERS_INTERNAL[id];
}

// Sum the per-axis deltas for a set of adopted charters. The returned
// record holds every axis in `CharterBonusAxis`; un-touched axes sit at
// 0 so a consumer reading a single axis never sees `undefined`. Caller
// applies the sum however its own axis demands — additive (morale,
// recruitment, pressure), multiplicative (production, loot, trade), or
// tile-integer (vision, ship speed).
export function aggregateCharterEffects(
  charterIds: Iterable<ArchiveCharterId>,
): Readonly<Record<CharterBonusAxis, number>> {
  const totals: Record<CharterBonusAxis, number> = {
    [CharterBonusAxis.CombatMorale]: 0,
    [CharterBonusAxis.RecruitmentSpeed]: 0,
    [CharterBonusAxis.ColonyProduction]: 0,
    [CharterBonusAxis.ShipyardCostReduction]: 0,
    [CharterBonusAxis.RaidLoot]: 0,
    [CharterBonusAxis.TradeMargin]: 0,
    [CharterBonusAxis.ExplorationVision]: 0,
    [CharterBonusAxis.ShipSpeed]: 0,
    [CharterBonusAxis.DiplomacyPressure]: 0,
    [CharterBonusAxis.RumourYield]: 0,
  };
  for (const id of charterIds) {
    if (!isArchiveCharterId(id)) continue;
    const charter = ARCHIVE_CHARTERS_INTERNAL[id];
    totals[charter.effect.axis] += charter.effect.delta;
  }
  return totals;
}
