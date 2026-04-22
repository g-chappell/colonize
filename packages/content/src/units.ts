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
