export const UnitType = {
  Scout: 'scout',
  Settler: 'settler',
  Sloop: 'sloop',
  Brig: 'brig',
  Frigate: 'frigate',
  ShipOfTheLine: 'ship-of-the-line',
  Privateer: 'privateer',
} as const;

export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export const ALL_UNIT_TYPES: readonly UnitType[] = Object.values(UnitType);

export const SHIP_UNIT_TYPES: readonly UnitType[] = [
  UnitType.Sloop,
  UnitType.Brig,
  UnitType.Frigate,
  UnitType.ShipOfTheLine,
  UnitType.Privateer,
];

export function isUnitType(value: unknown): value is UnitType {
  return typeof value === 'string' && (ALL_UNIT_TYPES as readonly string[]).includes(value);
}

export function isShipUnitType(value: unknown): value is UnitType {
  return isUnitType(value) && (SHIP_UNIT_TYPES as readonly string[]).includes(value);
}

export interface UnitTypeDefinition {
  readonly id: UnitType;
  readonly baseMovement: number;
}

const UNIT_TYPE_DEFINITIONS: Readonly<Record<UnitType, UnitTypeDefinition>> = {
  [UnitType.Scout]: { id: UnitType.Scout, baseMovement: 2 },
  [UnitType.Settler]: { id: UnitType.Settler, baseMovement: 1 },
  [UnitType.Sloop]: { id: UnitType.Sloop, baseMovement: 4 },
  [UnitType.Brig]: { id: UnitType.Brig, baseMovement: 3 },
  [UnitType.Frigate]: { id: UnitType.Frigate, baseMovement: 3 },
  [UnitType.ShipOfTheLine]: { id: UnitType.ShipOfTheLine, baseMovement: 2 },
  [UnitType.Privateer]: { id: UnitType.Privateer, baseMovement: 4 },
};

export function getUnitTypeDefinition(type: UnitType): UnitTypeDefinition {
  if (!isUnitType(type)) {
    throw new TypeError(`getUnitTypeDefinition: not a valid UnitType: ${String(type)}`);
  }
  return UNIT_TYPE_DEFINITIONS[type];
}
