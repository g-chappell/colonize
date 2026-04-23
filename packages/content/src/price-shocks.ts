// Price-shock event table for HomePort mid-price jolts.
//
// Each entry names one resource, a signed volumeDelta, and a one-line
// flavour message tagged with a tonal register. The engine's
// orchestrator picks an entry (by trigger: random turn roll, world
// event, faction-specific narrative beat) and hands
// `{resourceId, volumeDelta}` to `HomePort.applyPriceShock` in core,
// then surfaces the flavour copy on the trade screen / event feed.
//
// Sign convention matches HomePort's netVolume model:
//   positive volumeDelta  → glut, mid-price *drops* ('crash')
//   negative volumeDelta  → scarcity, mid-price *rises* ('spike')
// — both decay back toward baseline via `HomePort.tickPriceDrift`.
//
// Per CLAUDE.md, content never imports core; magnitudes are integer
// multiples of PRICE_VOLUME_STEP (=5 in core) so one shock shifts the
// mid-price by `|volumeDelta| / PRICE_VOLUME_STEP` units. This module
// tracks that value locally (see MAGNITUDE_STEP below) and the
// invariant test pins the relationship in case core changes the step.

import type { ResourceEntryId } from './resources.js';
import type { ToneRegister } from './palette.js';

export type PriceShockDirection = 'spike' | 'crash';

export interface PriceShockEvent {
  readonly id: string;
  readonly resourceId: ResourceEntryId;
  readonly direction: PriceShockDirection;
  readonly volumeDelta: number;
  readonly flavour: string;
  readonly register: ToneRegister;
}

// Per-step size; keep in sync with core's PRICE_VOLUME_STEP. Shock
// magnitudes are expressed as integer multiples of this, so one
// magnitude unit shifts the mid-price by exactly 1.
const MAGNITUDE_STEP = 5;

export const PRICE_SHOCKS: readonly PriceShockEvent[] = [
  {
    id: 'storm-floods-groveworks',
    resourceId: 'timber',
    direction: 'spike',
    volumeDelta: -MAGNITUDE_STEP * 3,
    flavour:
      'A gale has ripped through the coastal groves — standing timber is suddenly worth its weight in brass.',
    register: 'salt-and-rum',
  },
  {
    id: 'convoy-dumps-greenwood',
    resourceId: 'timber',
    direction: 'crash',
    volumeDelta: MAGNITUDE_STEP * 2,
    flavour:
      "A Syndicate convoy has dumped a season's worth of green-cut timber on the docks. Buyers are balking.",
    register: 'salt-and-rum',
  },
  {
    id: 'kelp-bloom-chokes-ropewalks',
    resourceId: 'fibre',
    direction: 'crash',
    volumeDelta: MAGNITUDE_STEP * 2,
    flavour:
      'The kelp bloom has come in thick this season. Every rope-walk between here and the Spire is drowning in fibre.',
    register: 'salt-and-rum',
  },
  {
    id: 'rigging-fleet-stripped-bare',
    resourceId: 'fibre',
    direction: 'spike',
    volumeDelta: -MAGNITUDE_STEP * 2,
    flavour: 'Three refitting fleets in a row have stripped the ropewalks bare. Fibre is scarce.',
    register: 'salt-and-rum',
  },
  {
    id: 'saltworks-glut',
    resourceId: 'provisions',
    direction: 'crash',
    volumeDelta: MAGNITUDE_STEP * 2,
    flavour: 'A bumper saltfish harvest means provisions are stacked to the rafters. Prices sag.',
    register: 'salt-and-rum',
  },
  {
    id: 'famine-on-the-windward-side',
    resourceId: 'provisions',
    direction: 'spike',
    volumeDelta: -MAGNITUDE_STEP * 3,
    flavour:
      'Famine on the windward reefs has every captain bidding up the provisions barrel. No hardtack is cheap today.',
    register: 'salt-and-rum',
  },
  {
    id: 'abyssal-wrack-washes-ashore',
    resourceId: 'salvage',
    direction: 'crash',
    volumeDelta: MAGNITUDE_STEP * 3,
    flavour:
      'Something vast surfaced and sank again overnight. The tideline is littered with pre-Collapse wrack — salvage is cheap until the scavengers slow down.',
    register: 'eldritch',
  },
  {
    id: 'scavenger-hunt-empties-shallows',
    resourceId: 'salvage',
    direction: 'spike',
    volumeDelta: -MAGNITUDE_STEP * 2,
    flavour:
      'A Rayon audit fleet has been sweeping the shallows for contraband salvage. Stocks are thin and twitchy.',
    register: 'salvaged-futurism',
  },
  {
    id: 'sawmill-runs-dry',
    resourceId: 'planks',
    direction: 'spike',
    volumeDelta: -MAGNITUDE_STEP * 2,
    flavour:
      'Every sawmill on the route is down for refit at once. Dimension planks fetch a tidy premium.',
    register: 'salt-and-rum',
  },
  {
    id: 'plank-surplus-after-refit',
    resourceId: 'planks',
    direction: 'crash',
    volumeDelta: MAGNITUDE_STEP * 2,
    flavour:
      "A shipyard has cancelled a refit — the planks they'd stockpiled are hitting the open market.",
    register: 'salt-and-rum',
  },
  {
    id: 'forge-guild-strike',
    resourceId: 'forgework',
    direction: 'spike',
    volumeDelta: -MAGNITUDE_STEP * 3,
    flavour:
      "The forgehands' guild has walked out over tithe rates. Forgework prices are climbing by the hour.",
    register: 'salvaged-futurism',
  },
  {
    id: 'syndicate-dumps-overrun',
    resourceId: 'forgework',
    direction: 'crash',
    volumeDelta: MAGNITUDE_STEP * 2,
    flavour:
      'Ironclad overproduction has flooded the quays with cast fittings. Forgework is cheap — for now.',
    register: 'salvaged-futurism',
  },
];

const SHOCK_IDS: readonly string[] = PRICE_SHOCKS.map((s) => s.id);

export function isPriceShockId(value: unknown): value is string {
  return typeof value === 'string' && SHOCK_IDS.includes(value);
}

export function getPriceShock(id: string): PriceShockEvent {
  const found = PRICE_SHOCKS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`getPriceShock: unknown price-shock id "${id}"`);
  }
  return found;
}

export function listPriceShocksForResource(
  resourceId: ResourceEntryId,
): readonly PriceShockEvent[] {
  return PRICE_SHOCKS.filter((s) => s.resourceId === resourceId);
}
