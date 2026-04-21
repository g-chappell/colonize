import type Phaser from 'phaser';
import type { FactionVisibility } from '@colonize/core';

import { FogOverlayState, FOG_COLOR } from './fog-overlay-state';
import { mapWorldBounds, renderedTileSize } from './tile-atlas';

// Single-GameObject fog-of-war overlay: one RenderTexture the size of
// the map, one black fill per tile with per-tile alpha sampled from a
// FogOverlayState. Redraws only when visibility changes or a reveal
// animation is in flight — idle turns cost nothing.
export class FogOverlay {
  private readonly scene: Phaser.Scene;
  private readonly mapWidth: number;
  private readonly mapHeight: number;
  private readonly state: FogOverlayState;
  private readonly renderTexture: Phaser.GameObjects.RenderTexture;

  constructor(
    scene: Phaser.Scene,
    mapWidth: number,
    mapHeight: number,
    initialVisibility: FactionVisibility,
    now: number = scene.time.now,
  ) {
    this.scene = scene;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.state = new FogOverlayState(mapWidth, mapHeight, initialVisibility);

    const { width: worldWidth, height: worldHeight } = mapWorldBounds(mapWidth, mapHeight);
    this.renderTexture = scene.add
      .renderTexture(0, 0, worldWidth, worldHeight)
      .setOrigin(0, 0)
      .setName('fog-overlay');

    this.redraw(now);
  }

  sync(visibility: FactionVisibility, now: number = this.scene.time.now): void {
    this.state.sync(visibility, now);
    this.redraw(now);
  }

  // Called from GameScene.update(); cheap no-op when idle.
  update(now: number = this.scene.time.now): void {
    if (!this.state.hasActiveTransitions(now)) return;
    this.redraw(now);
  }

  destroy(): void {
    this.renderTexture.destroy();
  }

  setDepth(depth: number): this {
    this.renderTexture.setDepth(depth);
    return this;
  }

  private redraw(now: number): void {
    const size = renderedTileSize();
    this.renderTexture.clear();
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const alpha = this.state.sampleAlpha(x, y, now);
        if (alpha <= 0) continue;
        this.renderTexture.fill(FOG_COLOR, alpha, x * size, y * size, size, size);
      }
    }
  }
}
