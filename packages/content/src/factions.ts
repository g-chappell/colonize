import type { ToneRegister } from './palette.js';

export type PlayableFactionId = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export interface FactionEntry {
  id: PlayableFactionId;
  name: string;
  tagline: string;
  lore: string;
  bonus: string;
  register: ToneRegister;
  crestColor: `#${string}`;
}

export const FACTIONS: readonly FactionEntry[] = [
  {
    id: 'otk',
    name: 'Order of the Kraken',
    tagline: 'Hic sunt dracones.',
    lore: "Keepers of the Kraken's bloodline oaths, hidden since the Collapse. They rise now to steer the Crimson Tide and prepare the prophesied return to the Abyss.",
    bonus: 'Sail Red Tide tiles unharmed and redeem Legendary Ship blueprints.',
    register: 'eldritch',
    crestColor: '#4af0e0',
  },
  {
    id: 'ironclad',
    name: 'Ironclad Syndicate',
    tagline: 'The ledger keeps the fleet.',
    lore: 'Smoke and hammer forge empires — the Syndicate sells iron to every flag. Their shipyards run day and night, and their loyalty is priced in coin.',
    bonus: 'Cheaper shipyards and +10% colony production.',
    register: 'salvaged-futurism',
    crestColor: '#e08e2c',
  },
  {
    id: 'phantom',
    name: 'Phantom Corsairs',
    tagline: 'No flag, no chain.',
    lore: 'Ghosts of the open sea, flagless and unaligned. They prey on convoys, vanish into fog, and thrive wherever the lanes of order run thin.',
    bonus: 'Stealth on open ocean and bonus loot on raids.',
    register: 'salt-and-rum',
    crestColor: '#d3c8b3',
  },
  {
    id: 'bloodborne',
    name: 'Bloodborne Legion',
    tagline: 'One volley. One breach.',
    lore: 'The disciplined boarding-fist of the Crimson Tide. Where a Legion pike falls, a Dominion banner follows — their muster rolls never run empty.',
    bonus: 'One free soldier per colony each turn and a combat bonus.',
    register: 'salt-and-rum',
    crestColor: '#b03a2e',
  },
];

export function getFaction(id: PlayableFactionId): FactionEntry {
  const found = FACTIONS.find((f) => f.id === id);
  if (!found) {
    throw new Error(`Unknown faction id: ${id}`);
  }
  return found;
}
