import Phaser from 'phaser';
import { TileType } from '@colonize/core';
import type { GameMap } from '@colonize/core';

import { ATLAS_KEYS, SCENE_KEYS } from './asset-keys';
import {
  OCEAN_ANIMATION_FRAMERATE,
  OCEAN_ANIMATION_FRAMES,
  OCEAN_ANIMATION_KEY,
  TILE_RENDER_SCALE,
  frameForTile,
  mapWorldBounds,
  tileCenterInWorld,
} from './tile-atlas';

export interface GameSceneInitData {
  readonly map: GameMap;
  // Optional camera focus (tile coords). Defaults to map centre.
  readonly cameraFocus?: { x: number; y: number };
}

export class GameScene extends Phaser.Scene {
  private mapModel: GameMap | null = null;
  // Follow target is a lightweight invisible sprite — Phaser cameras
  // follow GameObjects, not bare coords.
  private followTarget: Phaser.GameObjects.Sprite | null = null;

  constructor() {
    super({ key: SCENE_KEYS.game });
  }

  init(data: Partial<GameSceneInitData>): void {
    this.mapModel = data.map ?? null;
  }

  create(data: Partial<GameSceneInitData> = {}): void {
    const map = this.mapModel ?? data.map;
    if (!map) {
      // Guard: nothing to render without a map. Leaving the scene
      // empty is better than crashing; the menu flow should always
      // pass a map before entering this scene.
      return;
    }
    this.mapModel = map;

    this.ensureOceanAnimation();
    this.renderTiles(map);
    this.configureCamera(map, data.cameraFocus);
  }

  private ensureOceanAnimation(): void {
    if (this.anims.exists(OCEAN_ANIMATION_KEY)) return;
    this.anims.create({
      key: OCEAN_ANIMATION_KEY,
      frames: OCEAN_ANIMATION_FRAMES.map((f) => ({ key: ATLAS_KEYS.core, frame: f })),
      frameRate: OCEAN_ANIMATION_FRAMERATE,
      repeat: -1,
    });
  }

  private renderTiles(map: GameMap): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const type = map.get(x, y);
        const { x: worldX, y: worldY } = tileCenterInWorld(x, y);
        if (type === TileType.Ocean) {
          const sprite = this.add.sprite(worldX, worldY, ATLAS_KEYS.core, frameForTile(type));
          sprite.setScale(TILE_RENDER_SCALE);
          // Offset each sprite's animation start so the whole ocean
          // doesn't pulse in lockstep — feels flat otherwise.
          sprite.play(OCEAN_ANIMATION_KEY);
          sprite.anims.setProgress(((x * 7 + y * 3) % 11) / 11);
        } else {
          const image = this.add.image(worldX, worldY, ATLAS_KEYS.core, frameForTile(type));
          image.setScale(TILE_RENDER_SCALE);
        }
      }
    }
  }

  private configureCamera(map: GameMap, focus?: { x: number; y: number }): void {
    const { width: worldWidth, height: worldHeight } = mapWorldBounds(map.width, map.height);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, worldHeight);

    const fx = focus?.x ?? Math.floor(map.width / 2);
    const fy = focus?.y ?? Math.floor(map.height / 2);
    const tx = Math.max(0, Math.min(map.width - 1, fx));
    const ty = Math.max(0, Math.min(map.height - 1, fy));
    const { x: wx, y: wy } = tileCenterInWorld(tx, ty);

    this.followTarget = this.add.sprite(wx, wy, ATLAS_KEYS.core, frameForTile(TileType.Ocean));
    this.followTarget.setVisible(false);
    cam.startFollow(this.followTarget, true, 0.1, 0.1);
  }

  // Moves the camera follow target to a new tile. Public so HUD /
  // selection flows in later tasks can recenter the view (e.g. "jump
  // to colony"). Safe to call before or after create.
  setCameraFocus(tileX: number, tileY: number): void {
    if (!this.mapModel || !this.followTarget) return;
    const tx = Math.max(0, Math.min(this.mapModel.width - 1, tileX));
    const ty = Math.max(0, Math.min(this.mapModel.height - 1, tileY));
    const { x, y } = tileCenterInWorld(tx, ty);
    this.followTarget.setPosition(x, y);
  }
}
