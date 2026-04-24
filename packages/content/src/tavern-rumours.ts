import type { PlayableFactionId } from './factions.js';
import type { ToneRegister } from './palette.js';

export type TavernRumourId =
  | 'rumour-archive-cache-east'
  | 'rumour-archive-cache-south'
  | 'rumour-derelict-leeward'
  | 'rumour-kraken-shrine-fog'
  | 'rumour-fata-morgana-towers'
  | 'rumour-bloodborne-press-gang'
  | 'rumour-phantom-fog-bank'
  | 'rumour-ironclad-foundry-deal'
  | 'rumour-otk-bloodline-meet'
  | 'rumour-rayon-tithe-skim'
  | 'rumour-pale-watch-sighting'
  | 'rumour-rum-runners-late'
  | 'rumour-old-charts-resurfacing'
  | 'rumour-singing-buoy'
  | 'rumour-empty-keel'
  | 'rumour-collapse-era-relic';

// Trigger filters. Any unset field means "any". A rumour with all
// fields unset is fully ambient and surfaces in any tavern, in any
// year, for any faction. `weight` defaults to 1; setting it to 0
// removes a rumour from the random sampling pool even when its
// context filters would otherwise admit it (escape hatch for
// rumours that should only fire from a future scripted hook).
export interface TavernRumourTrigger {
  readonly town?: string;
  readonly year?: { readonly min?: number; readonly max?: number };
  readonly faction?: PlayableFactionId;
  readonly weight?: number;
}

export interface TavernRumourEntry {
  readonly id: TavernRumourId;
  readonly headline: string;
  readonly body: string;
  readonly register: ToneRegister;
  readonly trigger: TavernRumourTrigger;
}

export const TAVERN_RUMOURS: readonly TavernRumourEntry[] = [
  {
    id: 'rumour-archive-cache-east',
    headline: 'A waxed drum, east of the kelp drift',
    body: 'Two tide-washed deckhands swear they saw the corner of a tin chest pressed under the kelp east of here. Liberty broadsheets, they reckon — still dry inside.',
    register: 'salvaged-futurism',
    trigger: {},
  },
  {
    id: 'rumour-archive-cache-south',
    headline: 'Charter scraps in the southern shoals',
    body: 'A salt-trader off the southern reach laid down a parchment edge on the bar — Liberty seal half-burnt. Said the rest is bundled in oiled cloth on a sandbar a day south.',
    register: 'salvaged-futurism',
    trigger: { year: { min: 2 } },
  },
  {
    id: 'rumour-derelict-leeward',
    headline: 'A hull on the leeward reef',
    body: 'A topsail caught the morning glass and hung there like a ghost. Whoever ran her aground left her cargo to the gulls — for now.',
    register: 'salt-and-rum',
    trigger: {},
  },
  {
    id: 'rumour-kraken-shrine-fog',
    headline: 'Coral idols in the fog-bank',
    body: 'A net-mender swears she rowed past a drowned altar last fog. Her prow turned itself, she says. Her hands had nothing to do with it.',
    register: 'eldritch',
    trigger: {},
  },
  {
    id: 'rumour-fata-morgana-towers',
    headline: 'Towers, hung upside-down',
    body: 'Three sober helmsmen and a drunk lookout all tell the same story — a sea-mirror at dusk, towers strung upside-down on the horizon. The tide carried no shadow under them.',
    register: 'salt-and-rum',
    trigger: {},
  },
  {
    id: 'rumour-bloodborne-press-gang',
    headline: 'Crimson sashes on the quay',
    body: 'A Legion press-gang took two carouseling deckhands last night. The sergeant paid for the rum they spilled. He did not pay for the men.',
    register: 'salt-and-rum',
    trigger: { faction: 'bloodborne' },
  },
  {
    id: 'rumour-phantom-fog-bank',
    headline: 'A flagless brig in the fog',
    body: 'A brig with no colours rode the fog out of the channel mouth and was gone before the watch could ring. Phantom-work. Watch your bow lights.',
    register: 'salt-and-rum',
    trigger: { faction: 'phantom', weight: 2 },
  },
  {
    id: 'rumour-ironclad-foundry-deal',
    headline: 'A foundry-master takes private callers',
    body: 'A Syndicate foundry-master is buying salvage off the books — pays in coin, no ledger. Bring iron, leave with rum, ask no names.',
    register: 'salvaged-futurism',
    trigger: { faction: 'ironclad' },
  },
  {
    id: 'rumour-otk-bloodline-meet',
    headline: 'Twin-dragon mark, scratched into a cask',
    body: 'A bloodline scribe is meeting in the back room two nights from now. Bring the right token and you walk away with a charter copy. Bring the wrong one and you walk away short of fingers.',
    register: 'eldritch',
    trigger: { faction: 'otk' },
  },
  {
    id: 'rumour-rayon-tithe-skim',
    headline: 'Concord tithe-clerk, light-fingered',
    body: 'A Rayon tithe-clerk has been skimming the count and pinning it on bargemen. The barges are not pleased. Neither, soon, will be the Concord.',
    register: 'salvaged-futurism',
    trigger: { year: { min: 3 } },
  },
  {
    id: 'rumour-pale-watch-sighting',
    headline: 'Pale lights below the wave-line',
    body: 'A trawler crew swears they saw lanterns under their keel for half a watch. No swell, no shape, only the cold light. They will not put to sea this week.',
    register: 'eldritch',
    trigger: { weight: 2 },
  },
  {
    id: 'rumour-rum-runners-late',
    headline: 'The rum-runners are a fortnight late',
    body: "The Tortuga rum-run has not made the channel turn in fourteen days. Either the Phantom took her, or she's holed up somewhere honest. Bets on the back wall.",
    register: 'salt-and-rum',
    trigger: {},
  },
  {
    id: 'rumour-old-charts-resurfacing',
    headline: 'Pre-Collapse charts at the chandler',
    body: 'A chandler two streets over took a parcel of pre-Collapse sea-charts in trade. He cannot read them. He thinks you might.',
    register: 'salvaged-futurism',
    trigger: { year: { min: 1 } },
  },
  {
    id: 'rumour-singing-buoy',
    headline: 'A buoy that sings at slack water',
    body: "There's a marker out past the second reef that hums on the slack tide — three notes, always the same. Crews leave it offerings. None of them say to whom.",
    register: 'eldritch',
    trigger: {},
  },
  {
    id: 'rumour-empty-keel',
    headline: 'An empty keel washed up at dawn',
    body: 'Half a longboat, no crew, no oars, the rowlocks polished smooth as if from years of use. Found this morning on the strand. The harbourmaster has been writing letters.',
    register: 'salt-and-rum',
    trigger: {},
  },
  {
    id: 'rumour-collapse-era-relic',
    headline: 'A relic from before the long quiet',
    body: 'A salvager set a pitted disc on the bar last night — Liberty crest, edges still sharp. He bought rounds for the room and would not say where he pulled it from.',
    register: 'salvaged-futurism',
    trigger: { year: { min: 4 }, weight: 2 },
  },
];

const TAVERN_RUMOUR_IDS: readonly string[] = TAVERN_RUMOURS.map((r) => r.id);

export function isTavernRumourId(value: unknown): value is TavernRumourId {
  return typeof value === 'string' && TAVERN_RUMOUR_IDS.includes(value);
}

export function getTavernRumour(id: TavernRumourId): TavernRumourEntry {
  if (!isTavernRumourId(id)) {
    throw new TypeError(`getTavernRumour: not a valid TavernRumourId: ${String(id)}`);
  }
  const found = TAVERN_RUMOURS.find((r) => r.id === id);
  if (!found) {
    throw new Error(`getTavernRumour: missing TavernRumourEntry for ${id}`);
  }
  return found;
}

export interface TavernContext {
  readonly town: string;
  readonly year: number;
  readonly faction: PlayableFactionId;
}

// Filter rumours whose trigger admits the supplied context. A rumour
// with no filters always passes; a rumour with `weight === 0` is
// excluded from the eligible set so a future scripted opener can
// route it without it surfacing in the ambient roll.
export function eligibleTavernRumours(
  context: TavernContext,
  rumours: readonly TavernRumourEntry[] = TAVERN_RUMOURS,
): readonly TavernRumourEntry[] {
  return rumours.filter((r) => admits(r.trigger, context));
}

function admits(trigger: TavernRumourTrigger, context: TavernContext): boolean {
  if (trigger.weight === 0) return false;
  if (trigger.town !== undefined && trigger.town !== context.town) return false;
  if (trigger.faction !== undefined && trigger.faction !== context.faction) return false;
  if (trigger.year !== undefined) {
    if (trigger.year.min !== undefined && context.year < trigger.year.min) return false;
    if (trigger.year.max !== undefined && context.year > trigger.year.max) return false;
  }
  return true;
}

export function tavernRumourWeight(entry: TavernRumourEntry): number {
  return entry.trigger.weight ?? 1;
}
