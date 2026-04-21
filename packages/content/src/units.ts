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

export interface LegendaryShipSlot {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly unlocked: boolean;
}

export const OTK_LEGENDARY_SHIP_SLOTS: readonly LegendaryShipSlot[] = [
  {
    id: 'queen-annes-revenge',
    name: "Queen Anne's Revenge",
    description:
      "Blackbeard's flagship — a fast forty-gun terror. Reserved as an OTK Legendary slot; not yet rebuilt.",
    unlocked: false,
  },
  {
    id: 'black-pearl',
    name: 'The Black Pearl',
    description:
      'Black hull, black sails, an unholy turn of speed. Reserved as an OTK Legendary slot; not yet rebuilt.',
    unlocked: false,
  },
  {
    id: 'flying-dutchman',
    name: 'The Flying Dutchman',
    description:
      'Forty-six guns and a herald-of-catastrophe legend. Reserved as an OTK Legendary slot; not yet rebuilt.',
    unlocked: false,
  },
  {
    id: 'whydah',
    name: 'The Whydah',
    description:
      'Twenty-eight guns and the hold of a thousand prizes. Reserved as an OTK Legendary slot; not yet rebuilt.',
    unlocked: false,
  },
  {
    id: 'ranger',
    name: 'The Ranger',
    description:
      "Thirty-gun brig, sealed in legend under Calico Jack's command. Reserved as an OTK Legendary slot; not yet rebuilt.",
    unlocked: false,
  },
  {
    id: 'revenge',
    name: 'The Revenge',
    description:
      "Stede Bonnet's twelve-gun sloop, the quiet ghost of smuggling runs. Reserved as an OTK Legendary slot; not yet rebuilt.",
    unlocked: false,
  },
];
