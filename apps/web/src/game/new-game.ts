// New-game setup factory. Pure-sibling per the apps/web/src/game/CLAUDE.md
// rule — no Phaser in the import closure so the factory can be unit-tested
// directly with deterministic seeds. The Phaser side (GameCanvas) calls
// this once both the boot:complete bus event and the pendingNewGame store
// slice are set, then threads the result into startGameScene + the store.

import {
  FactionVisibility,
  HomePort,
  Unit,
  UnitType,
  generateMap,
  getUnitTypeDefinition,
  seedStartingCorridorKnowledge,
  type Coord,
  type GameMap,
  type HomePortJSON,
  type UnitJSON,
} from '@colonize/core';
import { getHomePortStartingPrices, type PlayableFactionId } from '@colonize/content';

export interface NewGameOptions {
  readonly seed: number;
  readonly factionId: PlayableFactionId;
  readonly width: number;
  readonly height: number;
}

export interface NewGameSetup {
  readonly map: GameMap;
  readonly visibility: FactionVisibility;
  readonly cameraFocus: Coord;
  readonly units: readonly UnitJSON[];
  readonly homePort: HomePortJSON;
}

export const DEFAULT_NEW_GAME_WIDTH = 40;
export const DEFAULT_NEW_GAME_HEIGHT = 25;

export function buildNewGameSetup(options: NewGameOptions): NewGameSetup {
  const { map, factionStarts } = generateMap({
    seed: options.seed,
    width: options.width,
    height: options.height,
    factionCount: 1,
  });
  const start = factionStarts[0];
  if (!start) {
    throw new Error('buildNewGameSetup: generateMap produced no faction start');
  }

  const starterUnit = new Unit({
    id: `${options.factionId}-flagship`,
    faction: options.factionId,
    position: start,
    type: UnitType.FoundingShip,
  });

  const visibility = new FactionVisibility(options.width, options.height);
  seedStartingCorridorKnowledge(visibility, map);
  const sightRadius = getUnitTypeDefinition(UnitType.FoundingShip).sightRadius;
  visibility.reveal(start, sightRadius);

  const homePort = new HomePort({
    id: `${options.factionId}-home`,
    faction: options.factionId,
    basePrices: getHomePortStartingPrices(options.factionId),
  });

  return {
    map,
    visibility,
    cameraFocus: { x: start.x, y: start.y },
    units: [starterUnit.toJSON()],
    homePort: homePort.toJSON(),
  };
}

// Picks a fresh PRNG seed for a new game. Uses the integer range
// `generateMap` accepts. Pulled out so tests can stub Math.random.
export function pickNewGameSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
