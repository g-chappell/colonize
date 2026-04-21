import Phaser from 'phaser';

import { ATLAS_KEYS, SCENE_KEYS } from './asset-keys';

// MainMenuScene — placeholder title screen. Will be replaced by a real
// menu + new-game flow in later tasks.
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.mainMenu });
  }

  create(): void {
    const { width, height } = this.scale.gameSize;

    this.add
      .text(width / 2, height / 2 - 40, 'COLONIZE', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '48px',
        color: '#d6b466',
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);

    this.add
      .text(width / 2, height / 2 + 8, 'Main Menu (placeholder)', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '16px',
        color: '#e8d8b8',
      })
      .setOrigin(0.5);

    const frames = this.textures.get(ATLAS_KEYS.core).getFrameNames();
    const previewY = height / 2 + 48;
    frames.forEach((frame, i) => {
      this.add
        .image(width / 2 + (i - (frames.length - 1) / 2) * 24, previewY, ATLAS_KEYS.core, frame)
        .setOrigin(0.5);
    });
  }
}
