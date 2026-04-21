import type { ToneRegister } from './palette.js';

// Mirrors `RumourOutcomeCategory` in packages/core/src/rumour/rumour.ts.
// Duplicated rather than imported because the workspace dependency
// direction forbids content → core imports. Consumers that bridge both
// (apps/web) pin the strings together in a test to catch drift.
export type RumourOutcomeCategoryId =
  | 'ArchiveCache'
  | 'LegendaryWreck'
  | 'KrakenShrine'
  | 'FataMorganaMirage';

export interface RumourOutcomeFlavourEntry {
  readonly category: RumourOutcomeCategoryId;
  readonly title: string;
  readonly flavour: string;
  // Optional OTK-only variant for LegendaryWreck — shown when the reward
  // is a Legendary blueprint instead of plain salvage. Other categories
  // use the same flavour regardless of faction.
  readonly otkFlavour?: string;
  readonly rewardLabel: string;
  readonly register: ToneRegister;
}

export const RUMOUR_OUTCOME_FLAVOURS: readonly RumourOutcomeFlavourEntry[] = [
  {
    category: 'ArchiveCache',
    title: 'Archive Cache',
    flavour:
      'Wax-sealed in a tin drum beneath the kelp: a bundle of Liberty broadsheets, still dry, still ringing with the old oaths.',
    rewardLabel: 'Liberty Chimes recovered',
    register: 'salvaged-futurism',
  },
  {
    category: 'LegendaryWreck',
    title: 'Legendary Wreck',
    flavour:
      'A shattered hull of unfamiliar make lies cracked on the reef. Your crew pry loose planks and fittings still worth the taking.',
    otkFlavour:
      'The bloodline marks on her keel answer your own. The blueprint she carried was meant to find you — its Legendary lines will sail again under Kraken colours.',
    rewardLabel: 'Salvage / Legendary blueprint',
    register: 'eldritch',
  },
  {
    category: 'KrakenShrine',
    title: 'Kraken Shrine',
    flavour:
      'A drowned altar, its coral idols staring up through the swell. Your crew leaves an offering; the water itself seems to note the gesture.',
    rewardLabel: 'Kraken reputation shifted',
    register: 'eldritch',
  },
  {
    category: 'FataMorganaMirage',
    title: 'Fata Morgana',
    flavour:
      'Towers hang upside-down on the horizon, a sea-mirror showing islands that may or may not be there. Rum is poured. Lookouts squint. The helmsman shrugs.',
    rewardLabel: 'Nothing · Bonus · Hazard',
    register: 'salt-and-rum',
  },
];

export function getRumourOutcomeFlavour(
  category: RumourOutcomeCategoryId,
): RumourOutcomeFlavourEntry {
  const found = RUMOUR_OUTCOME_FLAVOURS.find((f) => f.category === category);
  if (!found) {
    throw new Error(`Unknown rumour outcome category: ${category}`);
  }
  return found;
}
