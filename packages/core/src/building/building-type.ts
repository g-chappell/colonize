import type { ResourceId } from '../cargo/cargo-hold.js';

export const BuildingType = {
  Tavern: 'tavern',
  Warehouse: 'warehouse',
  RopeWalk: 'rope-walk',
  Sawmill: 'sawmill',
  FishMarket: 'fish-market',
  Saltworks: 'saltworks',
  Dockworks: 'dockworks',
  ChapelOfTheKraken: 'chapel-of-the-kraken',
  Watchtower: 'watchtower',
  Barracks: 'barracks',
  Distillery: 'distillery',
  Forge: 'forge',
  School: 'school',
  StudyHall: 'study-hall',
  Shipyard: 'shipyard',
  GunDeck: 'gun-deck',
} as const;

export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType];

export const ALL_BUILDING_TYPES: readonly BuildingType[] = Object.values(BuildingType);

export function isBuildingType(value: unknown): value is BuildingType {
  return typeof value === 'string' && (ALL_BUILDING_TYPES as readonly string[]).includes(value);
}

export interface BuildingDefinition {
  readonly id: BuildingType;
  readonly cost: { readonly [resourceId: ResourceId]: number };
  readonly prerequisites: readonly BuildingType[];
}

const BUILDING_DEFINITIONS: Readonly<Record<BuildingType, BuildingDefinition>> = {
  [BuildingType.Tavern]: {
    id: BuildingType.Tavern,
    cost: { timber: 15, fibre: 5 },
    prerequisites: [],
  },
  [BuildingType.Warehouse]: {
    id: BuildingType.Warehouse,
    cost: { timber: 20 },
    prerequisites: [],
  },
  [BuildingType.RopeWalk]: {
    id: BuildingType.RopeWalk,
    cost: { timber: 10, fibre: 10 },
    prerequisites: [],
  },
  [BuildingType.Sawmill]: {
    id: BuildingType.Sawmill,
    cost: { timber: 25 },
    prerequisites: [],
  },
  [BuildingType.FishMarket]: {
    id: BuildingType.FishMarket,
    cost: { timber: 15, fibre: 10 },
    prerequisites: [],
  },
  [BuildingType.Saltworks]: {
    id: BuildingType.Saltworks,
    cost: { timber: 10, salvage: 10 },
    prerequisites: [],
  },
  [BuildingType.Dockworks]: {
    id: BuildingType.Dockworks,
    cost: { timber: 20, fibre: 5 },
    prerequisites: [],
  },
  [BuildingType.ChapelOfTheKraken]: {
    id: BuildingType.ChapelOfTheKraken,
    cost: { timber: 20, salvage: 10 },
    prerequisites: [],
  },
  [BuildingType.Watchtower]: {
    id: BuildingType.Watchtower,
    cost: { timber: 15, salvage: 5 },
    prerequisites: [],
  },
  [BuildingType.Barracks]: {
    id: BuildingType.Barracks,
    cost: { timber: 20, planks: 10, fibre: 10 },
    prerequisites: [BuildingType.Dockworks],
  },
  [BuildingType.Distillery]: {
    id: BuildingType.Distillery,
    cost: { planks: 20, fibre: 10 },
    prerequisites: [BuildingType.Warehouse],
  },
  [BuildingType.Forge]: {
    id: BuildingType.Forge,
    cost: { planks: 20, salvage: 20 },
    prerequisites: [BuildingType.Sawmill],
  },
  [BuildingType.School]: {
    id: BuildingType.School,
    cost: { timber: 15, fibre: 5 },
    prerequisites: [BuildingType.Tavern],
  },
  [BuildingType.StudyHall]: {
    id: BuildingType.StudyHall,
    cost: { planks: 15, salvage: 10 },
    prerequisites: [BuildingType.ChapelOfTheKraken],
  },
  [BuildingType.Shipyard]: {
    id: BuildingType.Shipyard,
    cost: { timber: 20, planks: 40, forgework: 10 },
    prerequisites: [BuildingType.Sawmill, BuildingType.Dockworks],
  },
  [BuildingType.GunDeck]: {
    id: BuildingType.GunDeck,
    cost: { planks: 20, forgework: 30 },
    prerequisites: [BuildingType.Forge],
  },
};

export function getBuildingDefinition(type: BuildingType): BuildingDefinition {
  if (!isBuildingType(type)) {
    throw new TypeError(`getBuildingDefinition: not a valid BuildingType: ${String(type)}`);
  }
  return BUILDING_DEFINITIONS[type];
}
