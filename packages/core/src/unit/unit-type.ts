export const UnitType = {
  Scout: 'scout',
  Settler: 'settler',
} as const;

export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export const ALL_UNIT_TYPES: readonly UnitType[] = Object.values(UnitType);

export function isUnitType(value: unknown): value is UnitType {
  return typeof value === 'string' && (ALL_UNIT_TYPES as readonly string[]).includes(value);
}

export interface UnitTypeDefinition {
  readonly id: UnitType;
  readonly baseMovement: number;
}

const UNIT_TYPE_DEFINITIONS: Readonly<Record<UnitType, UnitTypeDefinition>> = {
  [UnitType.Scout]: { id: UnitType.Scout, baseMovement: 2 },
  [UnitType.Settler]: { id: UnitType.Settler, baseMovement: 1 },
};

export function getUnitTypeDefinition(type: UnitType): UnitTypeDefinition {
  if (!isUnitType(type)) {
    throw new TypeError(`getUnitTypeDefinition: not a valid UnitType: ${String(type)}`);
  }
  return UNIT_TYPE_DEFINITIONS[type];
}
