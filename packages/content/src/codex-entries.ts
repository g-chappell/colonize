// Codex entry registry. Content for the in-game Codex side-drawer
// (TASK-077). Entries are grouped by `category` in the UI. An entry
// is visible from the first Codex open when `unlockedFromStart: true`;
// otherwise it stays hidden until a gameplay orchestrator emits
// `codex:entry-unlocked` with the entry id (see the bus event in
// @colonize/shared). The rendering of locked-but-unlockable stubs as
// "fragmentary" text is TASK-078; for this task a locked entry simply
// does not appear in the drawer.
//
// Bodies are sourced from lore/OTK.md and must respect the canon-tier
// discipline: an entry's `canonTier` is the tier of the body text, not
// the umbrella section it lives in. `[OPEN]` entries deliberately keep
// their summary factual and leave any speculation out of `body`.

export type CodexCategory = 'faction' | 'bloodline' | 'horror' | 'ship' | 'location';

export type CodexCanonTier = 'established' | 'draft' | 'open';

export interface CodexEntry {
  readonly id: string;
  readonly category: CodexCategory;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly canonTier: CodexCanonTier;
  readonly unlockedFromStart?: boolean;
}

// Order inside each category is stable; the Codex viewer renders
// entries in array order within each group so authoring order is the
// display order. Categories themselves are ordered by CODEX_CATEGORIES
// below rather than by object-key insertion.
export const CODEX_ENTRIES: readonly CodexEntry[] = [
  // ── Factions ──────────────────────────────────────────────────
  {
    id: 'faction-otk',
    category: 'faction',
    title: 'Order of the Kraken',
    summary: 'Keepers of the thirteen bloodlines. Custodians of the Pirata Codex.',
    body: "Heirs of the Old World's Golden Age of Piracy, bound by bloodline to the thirteen captains whose Archive-recovered crests and family trees now serve as the Order's roll. The Kraken is their patron Horror; 'Hic sunt dracones' their mark and their warning.",
    canonTier: 'established',
    unlockedFromStart: true,
  },
  {
    id: 'faction-ironclad',
    category: 'faction',
    title: 'Ironclad Syndicate',
    summary: 'Industrial power-broker. Trades with both alignments, aligns with neither.',
    body: 'Controls resources and manufacturing hubs across the Rayon Passage. Their shipyards run day and night, and their loyalty is priced in coin — Crimson Tide, Azure Dominion, Forsaken, all are welcome at the ledger.',
    canonTier: 'established',
    unlockedFromStart: true,
  },
  {
    id: 'faction-phantom',
    category: 'faction',
    title: 'Phantom Corsairs',
    summary: 'Flagless, unaligned, unpredictable. Prey on every logistics train.',
    body: 'Rogue pirates who refuse alignment. Prey on both Tide and Dominion supply lines; thrive on chaos through stealth and unpredictability; briefly ally with anyone for the right score.',
    canonTier: 'established',
    unlockedFromStart: true,
  },
  {
    id: 'faction-bloodborne',
    category: 'faction',
    title: 'Bloodborne Legion',
    summary: "The Tide's disciplined boarding-fist. One volley. One breach.",
    body: 'The disciplined military arm of the Crimson Tide. Former soldiers, pirates, and revolutionaries. Lead direct assaults on Dominion forces to liberate oppressed territories — where a Legion pike falls, a Dominion banner follows.',
    canonTier: 'established',
    unlockedFromStart: true,
  },
  {
    id: 'faction-pale-watch',
    category: 'faction',
    title: 'Pale Watch',
    summary: 'Guardians of the Abyssal sites. Intervene only when necessary.',
    body: 'Keepers of the slumbering-sites of the Abyssal Horrors. Treat all other factions as potential threats to Abyssal containment; move against cultists, Dominion scientists, and Crimson Tide raiders alike when the sites are disturbed.',
    canonTier: 'established',
  },
  {
    id: 'faction-blackwater',
    category: 'faction',
    title: 'Blackwater Collective',
    summary: 'Smugglers, ex-mercenaries, and rogue traders of the Tide.',
    body: 'Provide resources and intelligence through underground supply routes; sabotage Dominion operations. Hosts of the black-market stalls where Kraken Talismans have been known to change hands.',
    canonTier: 'established',
  },

  // ── Bloodlines ────────────────────────────────────────────────
  {
    id: 'bloodline-bonny',
    category: 'bloodline',
    title: 'Anne Bonny',
    summary: 'Red-haired, fiery-tempered, formidable. Calico Jack\u2019s partner in piracy.',
    body: 'Born in Ireland around 1700. Moved to Nassau, the Bahamian sanctuary for pirates, where she met Calico Jack Rackham and became his pirate partner and lover. One of the most notorious female pirates of the Golden Age.',
    canonTier: 'established',
  },
  {
    id: 'bloodline-blackbeard',
    category: 'bloodline',
    title: 'Edward Teach — "Blackbeard"',
    summary: 'English. Captured La Concorde, renamed her Queen Anne\u2019s Revenge.',
    body: 'Operated around the West Indies and the eastern coast of Britain\u2019s North American colonies. Crewed Queen Anne\u2019s Revenge with over 300 men and 40 guns; tied lit slow matches under his hat to frighten his enemies.',
    canonTier: 'established',
  },
  {
    id: 'bloodline-black-bart',
    category: 'bloodline',
    title: 'Bartholomew Roberts — "Black Bart"',
    summary: 'Welsh. The most successful pirate of the Golden Age. Took over 400 prizes.',
    body: 'Raided off the Americas and the West African coast. Created his own Pirata Codex and adopted an early variant of the Skull and Crossbones flag. His infamy earned him the name The Great Pyrate, and later Black Bart.',
    canonTier: 'established',
  },
  {
    id: 'bloodline-ching-shih',
    category: 'bloodline',
    title: 'Ching Shih',
    summary: 'Chinese. Commanded one of the largest pirate fleets in history.',
    body: 'Began her career as a prostitute in Guangzhou; taken captive by the pirate Cheng I, she became his wife and partner in piracy. After his death she took control of his fleet — some 300 ships, up to 40,000 men — and expanded it through alliance past 1,500 ships.',
    canonTier: 'established',
  },
  {
    id: 'bloodline-kidd',
    category: 'bloodline',
    title: 'William Kidd',
    summary: 'Scottish. Commissioned privateer, turned pirate in practice.',
    body: 'Tried and executed in London in 1701 for murder and piracy, after capturing a French ship under an English captain. The persistent belief that he left buried treasure greatly contributed to the growth of his legend.',
    canonTier: 'established',
  },

  // ── Abyssal Horrors ───────────────────────────────────────────
  {
    id: 'horror-kraken',
    category: 'horror',
    title: 'Kraken',
    summary: 'A colossal tentacled beast. The OTK\u2019s patron Horror.',
    body: 'Drags entire fleets into the depths; symbol of chaos and destruction. In OTK Archive art: a skull-like head, octopus tentacles, the body of a dragon. Folk tales place the Kraken as the hunting force behind the Red Tide.',
    canonTier: 'established',
    unlockedFromStart: true,
  },
  {
    id: 'horror-leviathan',
    category: 'horror',
    title: 'Leviathan',
    summary: 'A vast sea serpent that controls the tides.',
    body: 'Capable of apocalyptic devastation through tidal waves and destruction.',
    canonTier: 'draft',
  },
  {
    id: 'horror-scylla',
    category: 'horror',
    title: 'Scylla',
    summary: 'A many-headed monster. Patron of the Sons of Scylla.',
    body: 'Known for swift, multi-pronged attacks. Embodies chaotic unpredictability and terror. The Sons of Scylla pattern their guerrilla ambushes after their patron.',
    canonTier: 'established',
  },
  {
    id: 'horror-cthulhu',
    category: 'horror',
    title: 'Cthulhu',
    summary: 'The Great Dreamer, slumbering beneath the ocean\u2019s abyss.',
    body: 'Brings madness and ruin upon awakening.',
    canonTier: 'draft',
  },

  // ── Legendary Ships ───────────────────────────────────────────
  {
    id: 'ship-queen-annes-revenge',
    category: 'ship',
    title: "Queen Anne's Revenge",
    summary: "Blackbeard's refitted flagship. Rumoured to carry 40 cannons.",
    body: 'Originally the French slave ship La Concorde, seized by Blackbeard in 1717 and refitted as his flagship. Famously fast — able both to run down her prey and outpace pirate-hunters. Legend has it Blackbeard himself scuttled her when finally outmatched.',
    canonTier: 'established',
  },
  {
    id: 'ship-black-pearl',
    category: 'ship',
    title: 'The Black Pearl',
    summary: 'Black hull, black sails. Reputed untouchable for her speed.',
    body: 'Originally known as the Wicked Wench; per legend, burned and sunk, then resurrected from the sea floor by Davy Jones himself and renamed. Said to be faster than the Flying Dutchman, weighed down only by the "curse of the Black Pearl."',
    canonTier: 'open',
  },
  {
    id: 'ship-flying-dutchman',
    category: 'ship',
    title: 'The Flying Dutchman',
    summary: 'Ghost ship destined to sail forever. Fastest on or beneath the sea.',
    body: 'Per Archive fragments: 420 tons, 170 feet stern to bow, 46 cannons plus 2 double-barrelled chase guns. European nautical myth deemed her a herald of catastrophe, her hull glowing with a ghostly light.',
    canonTier: 'draft',
  },
  {
    id: 'ship-whydah',
    category: 'ship',
    title: 'The Whydah',
    summary: "Sam Bellamy's 28-gun treasure-hunter. Ran aground drunk.",
    body: 'Originally a slave ship, captured on one of her voyages by pirates under "Black Sam" Bellamy. Became one of the most successful treasure-hunting ships of the Golden Age. Per the records, her last voyage ended when her drunk crew ran her aground.',
    canonTier: 'established',
  },

  // ── Locations ─────────────────────────────────────────────────
  {
    id: 'location-port-royal',
    category: 'location',
    title: 'Port Royal',
    summary: 'Hub floating city. Starting point for the Endeavour\u2019s expedition.',
    body: 'Home to the Tavern where OTK rumours and recruitment percolate. Starting locus for much narrative material and the first port of call for most crews leaving the Rayon Passage.',
    canonTier: 'established',
    unlockedFromStart: true,
  },
  {
    id: 'location-tortuga',
    category: 'location',
    title: 'Tortuga',
    summary: 'Floating city. Hosts the Black Market. Rough. Opportunistic.',
    body: 'Where Kraken Talismans have been known to be illegally traded. The city of no questions asked and no promises kept — crews call at Tortuga when they need something the Rayon lanes do not allow.',
    canonTier: 'established',
  },
  {
    id: 'location-barataria-bay',
    category: 'location',
    title: 'Barataria Bay',
    summary: 'Last floating city on the Rayon Passage before the frontier.',
    body: 'Beyond it lies unknown water. Origin of the "marked men" — Barataria Bay natives bearing the dragon-mark tattoo, whose significance is an Archive open question.',
    canonTier: 'draft',
  },
  {
    id: 'location-archive',
    category: 'location',
    title: 'The Archive',
    summary: 'Capsule of Old World history. First land since the Collapse.',
    body: 'Embedded in the rock face at the top of what was once a mountain, now an island of green amid the blue. Discovered by Captain James Sparrow and the crew of the Endeavour in NW 2191. Still only partially explored.',
    canonTier: 'established',
  },
  {
    id: 'location-red-tide',
    category: 'location',
    title: 'The Red Tide',
    summary: 'Vast crimson expanse of ocean with lethal daylight mist.',
    body: 'Folklore names it the hunting ground of the Kraken. The mist thins at dusk; crews who ran it in the Old World either returned changed, or did not return.',
    canonTier: 'draft',
  },
];

// Display order for the side-drawer sections. Adding a category to
// `CodexCategory` without listing it here is a type error — the array
// must cover every member of the union.
export const CODEX_CATEGORIES: readonly CodexCategory[] = [
  'faction',
  'bloodline',
  'horror',
  'ship',
  'location',
];

const CODEX_CATEGORY_LABELS: Readonly<Record<CodexCategory, string>> = {
  faction: 'Factions',
  bloodline: 'Bloodlines',
  horror: 'Abyssal Horrors',
  ship: 'Legendary Ships',
  location: 'Locations',
};

export function codexCategoryLabel(category: CodexCategory): string {
  return CODEX_CATEGORY_LABELS[category];
}

const ENTRY_BY_ID = new Map(CODEX_ENTRIES.map((entry) => [entry.id, entry]));

export function getCodexEntry(id: string): CodexEntry | undefined {
  return ENTRY_BY_ID.get(id);
}

export function isCodexEntryId(value: unknown): value is string {
  return typeof value === 'string' && ENTRY_BY_ID.has(value);
}

// Ids that are visible from the first Codex open, with no unlock event
// required. The helper returns a fresh array so callers cannot mutate
// the registry order by holding a reference.
export function initialUnlockedCodexEntryIds(): readonly string[] {
  return CODEX_ENTRIES.filter((entry) => entry.unlockedFromStart === true).map((entry) => entry.id);
}
