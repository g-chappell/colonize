import Phaser from 'phaser';
import type { GameMap } from '@colonize/core';

import { SCENE_KEYS } from './asset-keys';
import { BootScene } from './boot-scene';
import { MainMenuScene } from './main-menu-scene';
import { GameScene, type GameSceneInitData } from './game-scene';

export interface CreateGameOptions {
  parent: HTMLElement;
  width?: number;
  height?: number;
}

export function createGame({ parent, width = 960, height = 540 }: CreateGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#0c1e2b',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MainMenuScene, GameScene],
  });
}

// Transitions the running game into GameScene with a concrete map.
// Callers own map generation (they may pass a generateMap() result or
// a deserialized save). Separated from createGame so tests can
// exercise scene registration without forcing map construction.
export function startGameScene(
  game: Phaser.Game,
  map: GameMap,
  cameraFocus?: GameSceneInitData['cameraFocus'],
): void {
  const data: GameSceneInitData = cameraFocus ? { map, cameraFocus } : { map };
  game.scene.start(SCENE_KEYS.game, data);
}
