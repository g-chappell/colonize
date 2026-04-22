// Liberty Chimes flavour — tooltip + narrative copy for the Elders
// Council convocation ladder.
//
// The rule-relevant numbers (per-building chime rate + threshold
// ladder) live in `@colonize/core/chimes`. Content mirrors the
// threshold values next to narrative copy so HUD / tooltip code gets
// the full entry without the content-to-core cross-workspace edge
// the dependency-direction rule forbids. A sibling test under
// `packages/core/src/chimes/chimes-registry.test.ts` pins the core
// numbers; the content drift guard below (see chimes-flavour.test.ts)
// asserts the two copies agree.
//
// Canon register: salt-and-rum (pirate-elder council, oaken table,
// brass chimes) with a thin eldritch wash (the Kraken-blessed
// chapel is a producer). Surfaces that show this copy: the colony
// tooltip for chime-producing buildings, the Council modal's
// preamble, the roadmap-to-sovereignty HUD tracker.

import type { ToneRegister } from './palette.js';

export interface CouncilThresholdFlavour {
  readonly threshold: number;
  readonly heading: string;
  readonly summary: string;
  readonly preamble: string;
  readonly register: ToneRegister;
}

// Ascending by threshold — mirrors @colonize/core's
// LIBERTY_CHIMES_THRESHOLDS. Drift test asserts the two copies agree.
export const COUNCIL_THRESHOLD_FLAVOURS: readonly CouncilThresholdFlavour[] = [
  {
    threshold: 50,
    heading: 'A First Gathering',
    summary: 'The Elders muster at the harbour chapel. Charters drawn.',
    preamble:
      'Salt-cracked voices, lantern smoke, a brass chime passed hand to hand. The first Council names us as their own — and asks what charter we will carry forward.',
    register: 'salt-and-rum',
  },
  {
    threshold: 150,
    heading: 'The Second Sounding',
    summary: 'Word travels beyond the shallows. Another charter is offered.',
    preamble:
      'Chimes carry across three bays now; the Elders arrive by longboat, by pinnace, by stranger hulls none of us christened. A second charter, and the question sharpens: what kind of free folk are we?',
    register: 'salt-and-rum',
  },
  {
    threshold: 300,
    heading: 'A Kraken-Witnessed Council',
    summary: 'The Chapel rings past midnight. The Kraken hears.',
    preamble:
      'The tide rises uncalled. Chapel bells split the fog, and the great dark shape beyond the reef does not move — only listens. Elders do not name the guest. A third charter is offered, binding us deeper.',
    register: 'eldritch',
  },
  {
    threshold: 500,
    heading: 'The Liberty Accord',
    summary: 'The final charter. The Accord is written in full.',
    preamble:
      'Every chime in the archipelago answers every other. The Elders read from paper that salt has not yet touched. The fourth and final charter is pressed into our hands, and the Concord — far off, taxing other seas — has not yet noticed what we have become.',
    register: 'salt-and-rum',
  },
];

export const LIBERTY_CHIMES_SUMMARY =
  'Chime-producing halls (the Chapel of the Kraken, the Archive & Study Hall) ring out Liberty Chimes each turn. Enough of them summon the Elders Council — and with it, Archive Charters that reshape your free-fleet for good.';

export function getCouncilThresholdFlavour(threshold: number): CouncilThresholdFlavour {
  const found = COUNCIL_THRESHOLD_FLAVOURS.find((f) => f.threshold === threshold);
  if (!found) {
    throw new Error(`Unknown Council threshold: ${threshold}`);
  }
  return found;
}

export function isCouncilThresholdValue(value: unknown): boolean {
  return typeof value === 'number' && COUNCIL_THRESHOLD_FLAVOURS.some((f) => f.threshold === value);
}
