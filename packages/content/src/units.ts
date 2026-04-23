export type ShipClassId = 'sloop' | 'brig' | 'frigate' | 'ship-of-the-line' | 'privateer';

export interface ShipClassEntry {
  readonly id: ShipClassId;
  readonly name: string;
  readonly description: string;
  readonly hull: number;
  readonly guns: number;
  readonly crewCapacity: number;
  readonly baseMovement: number;
}

export const SHIP_CLASSES: readonly ShipClassEntry[] = [
  {
    id: 'sloop',
    name: 'Sloop',
    description:
      'Single-masted runner, light on guns and ballast. Slips into ports and out of trouble.',
    hull: 30,
    guns: 10,
    crewCapacity: 70,
    baseMovement: 4,
  },
  {
    id: 'brig',
    name: 'Brig',
    description:
      'Two-masted workhorse. Sturdier than a sloop, stronger broadside, still nimble enough for raiding.',
    hull: 50,
    guns: 18,
    crewCapacity: 100,
    baseMovement: 3,
  },
  {
    id: 'frigate',
    name: 'Frigate',
    description:
      'Fifth-rate warship. The fast-cruiser balance of pace, hull, and gunpower preferred for fleet escort.',
    hull: 75,
    guns: 32,
    crewCapacity: 200,
    baseMovement: 3,
  },
  {
    id: 'ship-of-the-line',
    name: 'Ship of the Line',
    description:
      'Multi-deck capital ship. Slow and ungainly, but few hulls survive a full broadside.',
    hull: 120,
    guns: 64,
    crewCapacity: 500,
    baseMovement: 2,
  },
  {
    id: 'privateer',
    name: 'Privateer',
    description:
      'Letter-of-marque corsair. Quick, handy, built to chase prizes more than to stand in the line.',
    hull: 35,
    guns: 14,
    crewCapacity: 90,
    baseMovement: 4,
  },
];

const SHIP_CLASS_IDS: readonly string[] = SHIP_CLASSES.map((s) => s.id);

export function isShipClassId(value: unknown): value is ShipClassId {
  return typeof value === 'string' && SHIP_CLASS_IDS.includes(value);
}

export function getShipClass(id: ShipClassId): ShipClassEntry {
  if (!isShipClassId(id)) {
    throw new TypeError(`getShipClass: not a valid ShipClassId: ${String(id)}`);
  }
  const found = SHIP_CLASSES.find((s) => s.id === id);
  if (!found) {
    throw new Error(`getShipClass: missing ShipClassEntry for ${id}`);
  }
  return found;
}

export type LegendaryShipId =
  | 'queen-annes-revenge'
  | 'black-pearl'
  | 'flying-dutchman'
  | 'whydah'
  | 'ranger'
  | 'revenge';

// Stat block mirrors ShipClassEntry so HUD + shipyard code can treat a redeemed
// legendary ship as a drop-in class. Numbers are lore-grounded (OTK.md §9) and
// dominate the baseClass — >= on every axis, > on at least one — so the
// blueprint redemption always pays off without flattening the speed hierarchy.
export interface LegendaryShipSlot {
  readonly id: LegendaryShipId;
  readonly name: string;
  readonly description: string;
  readonly baseClass: ShipClassId;
  readonly hull: number;
  readonly guns: number;
  readonly crewCapacity: number;
  readonly baseMovement: number;
}

export const OTK_LEGENDARY_SHIP_SLOTS: readonly LegendaryShipSlot[] = [
  {
    id: 'queen-annes-revenge',
    name: "Queen Anne's Revenge",
    description:
      "Blackbeard's flagship — a forty-gun terror under a blackened hull and a banner of black smoke.",
    baseClass: 'frigate',
    hull: 90,
    guns: 40,
    crewCapacity: 250,
    baseMovement: 3,
  },
  {
    id: 'black-pearl',
    name: 'The Black Pearl',
    description:
      'Black hull, black sails, black spars — and an unnatural turn of speed no privateer has ever matched.',
    baseClass: 'privateer',
    hull: 50,
    guns: 20,
    crewCapacity: 110,
    baseMovement: 5,
  },
  {
    id: 'flying-dutchman',
    name: 'The Flying Dutchman',
    description:
      'Forty-eight guns across a herald-of-catastrophe hull, rumoured fastest ship both on and beneath the sea.',
    baseClass: 'frigate',
    hull: 100,
    guns: 48,
    crewCapacity: 300,
    baseMovement: 4,
  },
  {
    id: 'whydah',
    name: 'The Whydah',
    description:
      "A frigate-scaled prize-taker; its hold is said to have borne a thousand captures before Bellamy's wreck.",
    baseClass: 'frigate',
    hull: 80,
    guns: 32,
    crewCapacity: 220,
    baseMovement: 3,
  },
  {
    id: 'ranger',
    name: 'The Ranger',
    description:
      'A thirty-gun brig sealed in legend under the flags of Hornigold, Vane, Bellamy, and Bonnet.',
    baseClass: 'brig',
    hull: 60,
    guns: 30,
    crewCapacity: 130,
    baseMovement: 4,
  },
  {
    id: 'revenge',
    name: 'The Revenge',
    description:
      "Stede Bonnet's twelve-gun sloop — the quiet ghost of smuggling runs, rebuilt keener than ever.",
    baseClass: 'sloop',
    hull: 40,
    guns: 14,
    crewCapacity: 90,
    baseMovement: 5,
  },
];

export const ALL_LEGENDARY_SHIP_IDS: readonly LegendaryShipId[] = OTK_LEGENDARY_SHIP_SLOTS.map(
  (s) => s.id,
);

export function isLegendaryShipId(value: unknown): value is LegendaryShipId {
  return typeof value === 'string' && (ALL_LEGENDARY_SHIP_IDS as readonly string[]).includes(value);
}

export function getLegendaryShip(id: LegendaryShipId): LegendaryShipSlot {
  const found = OTK_LEGENDARY_SHIP_SLOTS.find((s) => s.id === id);
  if (!found) {
    throw new TypeError(`getLegendaryShip: not a valid LegendaryShipId: ${String(id)}`);
  }
  return found;
}

export type SpecialistClassId = 'cartographer' | 'explorer';

// Specialist ships built for reconnaissance, not for the line of battle:
// double the sight of a standard ship, a shade faster than a sloop, and
// carrying only the guns needed to chase off an over-eager patrol. The
// stat block mirrors the rule-relevant primitives in
// `packages/core/src/unit/unit-type.ts` (`baseMovement`, `sightRadius`)
// alongside descriptive fields the HUD needs in one read; the test
// below pins the two copies together.
export interface SpecialistClassEntry {
  readonly id: SpecialistClassId;
  readonly name: string;
  readonly description: string;
  readonly hull: number;
  readonly guns: number;
  readonly crewCapacity: number;
  readonly baseMovement: number;
  readonly sightRadius: number;
}

export const SPECIALIST_CLASSES: readonly SpecialistClassEntry[] = [
  {
    id: 'cartographer',
    name: 'Cartographer',
    description:
      "Sparrow's old craft, by her own account — a shallow-keeled survey sloop, canvas patched with older canvas, her hold full of brass dividers and tarred chart-rolls. She traces coastlines no admiralty has seen and brings the line back marked.",
    hull: 25,
    guns: 4,
    crewCapacity: 60,
    baseMovement: 5,
    sightRadius: 4,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description:
      'A long-range scout cutter — high-masted, loose-laden, running ahead of the fleet on a skirmisher\'s rig. "She\'ll outrun what she can\'t outfight," Sparrow wrote, "and she can\'t outfight much."',
    hull: 30,
    guns: 6,
    crewCapacity: 70,
    baseMovement: 5,
    sightRadius: 4,
  },
];

const SPECIALIST_CLASS_IDS: readonly string[] = SPECIALIST_CLASSES.map((s) => s.id);

export function isSpecialistClassId(value: unknown): value is SpecialistClassId {
  return typeof value === 'string' && SPECIALIST_CLASS_IDS.includes(value);
}

export function getSpecialistClass(id: SpecialistClassId): SpecialistClassEntry {
  if (!isSpecialistClassId(id)) {
    throw new TypeError(`getSpecialistClass: not a valid SpecialistClassId: ${String(id)}`);
  }
  const found = SPECIALIST_CLASSES.find((s) => s.id === id);
  if (!found) {
    throw new Error(`getSpecialistClass: missing SpecialistClassEntry for ${id}`);
  }
  return found;
}

export type GroundClassId = 'marines' | 'dragoons' | 'pikemen';

// Descriptive + stat block for a ground unit class. `attack` / `defense` /
// `hp` are the rule-relevant stats the ground-combat resolver reads through
// the caller (scalar-seam pattern); `baseMovement` mirrors the core registry
// entry. `beats` names the class this unit has a rock-paper-scissors advantage
// over — the resolver reads it to apply the RPS multiplier.
export interface GroundClassEntry {
  readonly id: GroundClassId;
  readonly name: string;
  readonly description: string;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly baseMovement: number;
  readonly beats: GroundClassId;
}

export const GROUND_CLASSES: readonly GroundClassEntry[] = [
  {
    id: 'marines',
    name: 'Marines',
    description:
      'Disciplined musket-and-bayonet line. A steady volley shreds a pike line before it can close.',
    hp: 30,
    attack: 14,
    defense: 12,
    baseMovement: 1,
    beats: 'pikemen',
  },
  {
    id: 'dragoons',
    name: 'Dragoons',
    description:
      'Fast-moving skirmishers — part-rider, part-raider. Slip around a musket line to hit the flank before the second volley.',
    hp: 25,
    attack: 16,
    defense: 9,
    baseMovement: 2,
    beats: 'marines',
  },
  {
    id: 'pikemen',
    name: 'Pikemen',
    description:
      'Close-order spears and boarding pikes. The hedge of points stops a dragoon charge dead.',
    hp: 35,
    attack: 11,
    defense: 15,
    baseMovement: 1,
    beats: 'dragoons',
  },
];

const GROUND_CLASS_IDS: readonly string[] = GROUND_CLASSES.map((g) => g.id);

export function isGroundClassId(value: unknown): value is GroundClassId {
  return typeof value === 'string' && GROUND_CLASS_IDS.includes(value);
}

export function getGroundClass(id: GroundClassId): GroundClassEntry {
  if (!isGroundClassId(id)) {
    throw new TypeError(`getGroundClass: not a valid GroundClassId: ${String(id)}`);
  }
  const found = GROUND_CLASSES.find((g) => g.id === id);
  if (!found) {
    throw new Error(`getGroundClass: missing GroundClassEntry for ${id}`);
  }
  return found;
}
