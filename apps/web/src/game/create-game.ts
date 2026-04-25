import Phaser from 'phaser';
import type { GameMap } from '@colonize/core';

import { SCENE_KEYS } from './asset-keys';
import { AudioManager } from './audio-manager';
import { BootScene } from './boot-scene';
import { GameScene, type GameSceneInitData } from './game-scene';

export const AUDIO_REGISTRY_KEY = 'audioManager';

export interface CreateGameOptions {
  parent: HTMLElement;
  width?: number;
  height?: number;
}

export function createGame({ parent, width = 960, height = 540 }: CreateGameOptions): Phaser.Game {
  const game = new Phaser.Game({
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
    scene: [BootScene, GameScene],
  });
  // AudioManager is owned by the Phaser.Game — constructed once the
  // sound manager exists, stored on the registry so any scene can
  // reach it via `this.registry.get(AUDIO_REGISTRY_KEY)`. Destroyed in
  // a `destroy` hook so the queued BGM handle is released.
  const audio = new AudioManager(game.sound);
  game.registry.set(AUDIO_REGISTRY_KEY, audio);
  game.events.once(Phaser.Core.Events.DESTROY, () => audio.destroy());
  return game;
}

// Transitions the running game into GameScene with a concrete map.
// Callers own map generation (they may pass a generateMap() result or
// a deserialized save). Separated from createGame so tests can
// exercise scene registration without forcing map construction.
export function startGameScene(
  game: Phaser.Game,
  map: GameMap,
  options: {
    cameraFocus?: GameSceneInitData['cameraFocus'];
    visibility?: GameSceneInitData['visibility'];
  } = {},
): void {
  // Only attach optional fields when explicitly provided — TS strict
  // mode's `exactOptionalPropertyTypes` forbids writing `undefined`
  // into an optional property.
  const data: GameSceneInitData = { map };
  const withFocus = options.cameraFocus ? { ...data, cameraFocus: options.cameraFocus } : data;
  const final = options.visibility ? { ...withFocus, visibility: options.visibility } : withFocus;
  game.scene.start(SCENE_KEYS.game, final);
}
