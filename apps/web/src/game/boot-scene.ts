import Phaser from 'phaser';

import { bus } from '../bus';
import { ATLAS_KEYS, ATLAS_PATHS, SCENE_KEYS } from './asset-keys';
import { loadAudioStems } from './audio-manager';

// BootScene — preloads the atlas + audio and shows a progress bar.
// Emits 'boot:complete' on `create` so the React-side host (GameCanvas)
// can call startGameScene once a pendingNewGame has been queued. The
// scene itself stays alive (showing the dark background) until
// startGameScene swaps to GameScene; React owns all menu chrome above
// the canvas, so there is no Phaser-side main menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.boot });
  }

  preload(): void {
    this.drawLoadingBar();
    this.load.atlas(ATLAS_KEYS.core, ATLAS_PATHS.core.png, ATLAS_PATHS.core.json);
    loadAudioStems(this.load);
  }

  create(): void {
    bus.emit('boot:complete', {});
  }

  private drawLoadingBar(): void {
    const { width, height } = this.scale.gameSize;
    const barW = Math.min(360, Math.floor(width * 0.6));
    const barH = 14;
    const barX = Math.floor((width - barW) / 2);
    const barY = Math.floor(height / 2 - barH / 2);

    const frame = this.add.graphics();
    frame.lineStyle(2, 0xd6b466, 1);
    frame.strokeRect(barX, barY, barW, barH);

    const fill = this.add.graphics();
    const label = this.add.text(width / 2, barY - 24, 'Loading…', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '16px',
      color: '#e8d8b8',
    });
    label.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      fill.clear();
      fill.fillStyle(0xd6b466, 1);
      fill.fillRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * value), barH - 4);
    });

    this.load.on('complete', () => {
      frame.destroy();
      fill.destroy();
      label.destroy();
    });
  }
}
