// Concord-tithe flavour — heading + boycott copy for the per-turn
// payment modal AND the HUD tension chip.
//
// Indexed by *escalation tier* (0..4) rather than by raw tension
// threshold value: tier 0 = no thresholds crossed yet (the baseline
// tithe), tier 1..4 = the 25/50/75/100 ladder in
// `CONCORD_TENSION_THRESHOLDS` from `@colonize/core`. Indexing by tier
// keeps the content table independent of the literal threshold values
// — the future Concord-difficulty registry can rescale the ladder
// (test-short, per-difficulty) without forcing a content rewrite. The
// UI computes `tier = crossed.length` from the `ConcordTensionMeter`
// snapshot.
//
// Canon register: salt-and-rum at the lower tiers (a herald, a ledger,
// merchants withdrawing their custom — the recognisable shape of an
// imperial revenue service) shifting eldritch at the ultimatum tier
// where the Concord stops talking and starts arming. The fourth-tier
// copy is deliberately ominous: tier 4 is the same beat that
// TASK-070's Sovereignty trigger will fire on, so the modal copy and
// the war-overlay copy must read as one continuous escalation.

import type { ToneRegister } from './palette.js';

export type ConcordTensionTier = 0 | 1 | 2 | 3 | 4;

export interface TitheFlavour {
  readonly tier: ConcordTensionTier;
  readonly heading: string;
  readonly summary: string;
  readonly boycottFlavour: string;
  readonly tierLabel: string;
  readonly register: ToneRegister;
}

export const TITHE_FLAVOURS: readonly TitheFlavour[] = [
  {
    tier: 0,
    heading: 'Concord Tithe',
    summary:
      'A herald arrives at the harbourmaster with a sealed ledger. The Concord expects its due.',
    boycottFlavour:
      'You wave the herald off. He folds the ledger with a careful hand and notes the refusal in the margin. Word travels.',
    tierLabel: 'Quiet',
    register: 'salt-and-rum',
  },
  {
    tier: 1,
    heading: 'A Concord Warning',
    summary: 'The herald carries a Concord seal this time. Last refusal has been noted.',
    boycottFlavour:
      'The herald stares at the unstamped ledger for a long moment, then turns on his heel. The tithe-ship in the bay does not raise sail.',
    tierLabel: 'Warning',
    register: 'salt-and-rum',
  },
  {
    tier: 2,
    heading: 'A Formal Demand',
    summary:
      'A junior magistrate, two clerks, a writ of accounting. The next refusal will be entered in the Rayon ledger.',
    boycottFlavour:
      'The magistrate sets down the writ and asks for your name in full. He writes it carefully, twice. You are no longer simply forgetful — you are a matter of record.',
    tierLabel: 'Demand',
    register: 'salt-and-rum',
  },
  {
    tier: 3,
    heading: 'A Concord Threat',
    summary:
      'Sympathisers withdraw from your ports. The next ledger comes with an escort of marines.',
    boycottFlavour:
      'The marines do not draw — yet. They walk the docks, count your ships, mark the masts that fly your colours. By morning, three of your factor-friends have closed their stalls.',
    tierLabel: 'Threat',
    register: 'eldritch',
  },
  {
    tier: 4,
    heading: 'Concord Ultimatum',
    summary:
      'No herald. A Concord frigate stands off the bay. The tithe will be levied — by your hand, or by their broadside.',
    boycottFlavour:
      'The frigate signals at noon, again at dusk, and once more in the small hours. By the third lantern you understand: there will be no fourth ledger. The Concord has decided.',
    tierLabel: 'Ultimatum',
    register: 'eldritch',
  },
];

export const CONCORD_TENSION_TIER_VALUES: readonly ConcordTensionTier[] = [0, 1, 2, 3, 4];

export function getTitheFlavour(tier: ConcordTensionTier): TitheFlavour {
  const found = TITHE_FLAVOURS.find((f) => f.tier === tier);
  if (!found) {
    throw new Error(`Unknown Concord tension tier: ${String(tier)}`);
  }
  return found;
}

export function isConcordTensionTier(value: unknown): value is ConcordTensionTier {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (CONCORD_TENSION_TIER_VALUES as readonly number[]).includes(value)
  );
}
