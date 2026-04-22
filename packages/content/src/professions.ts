// Profession flavour entries for the HUD / tooltips.
//
// The save-format-bound registry (ProfessionType + multipliers) lives in
// @colonize/core; this module mirrors the ids next to the flavour copy so
// a single tooltip read gets the full entry without needing both
// workspaces. Per CLAUDE.md, content never imports core — the id list is
// kept in sync by the invariant test in professions.test.ts, mirroring the
// BUILDINGS / TILE_YIELDS / RESOURCES pattern.

export type ProfessionEntryId =
  | 'deckhand'
  | 'shipwright'
  | 'gunner'
  | 'cartographer'
  | 'scholar'
  | 'quartermaster'
  | 'loremaster';

export interface ProfessionEntry {
  readonly id: ProfessionEntryId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
}

export const PROFESSIONS: readonly ProfessionEntry[] = [
  {
    id: 'deckhand',
    name: 'Deckhand',
    summary: 'Unspecialised hand — every ship has more than it needs.',
    description:
      'Tarred fingers, salt in the hair, no badge to speak of. A deckhand will haul a line, pull an oar, or stand a watch — and can be trained into anything else if a school can be found.',
  },
  {
    id: 'shipwright',
    name: 'Shipwright',
    summary: 'Lifts plank throughput at the sawmill and shipyard.',
    description:
      'Adze-handled, calloused, and quietly contemptuous of carpenters. A shipwright knows where the keel scarf wants its rivets and which timber the salt has already begun to take.',
  },
  {
    id: 'gunner',
    name: 'Gunner',
    summary: 'Boosts forgework and gun-deck output (cannon-casting).',
    description:
      'Powder-stained, half-deaf, and superstitious about the third shot of any pour. A gunner reads the colour of a heated barrel the way a navigator reads a chart.',
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    summary: 'Lifts salvage from wrecks and floating-city tiles.',
    description:
      'Ink-fingered, mica-cold, eyes that have spent too long over chart-glass. A cartographer who has seen a Rayon stamp can pick the worth out of a wreck a wrecker would step over.',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    summary: 'Boosts study-hall lore recovery from salvaged texts.',
    description:
      'Reads the dialects no captain bothered to learn — Pre-Collapse charters, Liberty Era cant, the half-burned manifests that survive a wreck. Pays in codex entries, not coin.',
  },
  {
    id: 'quartermaster',
    name: 'Quartermaster',
    summary: 'Lifts provisions yield and warehouse / fish-market output.',
    description:
      "Counts barrels twice, and the second count is the one that goes in the ledger. A good quartermaster keeps a hold dry, a larder honest, and the cook's hand off the salt-pot.",
  },
  {
    id: 'loremaster',
    name: 'Loremaster',
    summary: 'Lifts chapel-of-the-kraken talisman blessings.',
    description:
      'Speaks the Kraken-rite without flinching, knows which candle to light when the bowl-water moves on its own. A loremaster blessing a voyage is the closest a captain comes to a guarantee.',
  },
];

const PROFESSION_IDS: readonly string[] = PROFESSIONS.map((p) => p.id);

export function isProfessionEntryId(value: unknown): value is ProfessionEntryId {
  return typeof value === 'string' && PROFESSION_IDS.includes(value);
}

export function getProfession(id: ProfessionEntryId): ProfessionEntry {
  if (!isProfessionEntryId(id)) {
    throw new TypeError(`getProfession: not a valid ProfessionEntryId: ${String(id)}`);
  }
  const found = PROFESSIONS.find((p) => p.id === id);
  if (!found) {
    throw new Error(`getProfession: missing ProfessionEntry for ${id}`);
  }
  return found;
}
