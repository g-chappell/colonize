import Phaser from 'phaser';

import { BootScene } from './boot-scene';
import { MainMenuScene } from './main-menu-scene';

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
    scene: [BootScene, MainMenuScene],
  });
}
