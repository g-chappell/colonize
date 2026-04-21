import Phaser from 'phaser';
import { TileType } from '@colonize/core';
import type { FactionVisibility, GameMap } from '@colonize/core';

import { useGameStore } from '../store/game';
import { ATLAS_KEYS, SCENE_KEYS } from './asset-keys';
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  applyPinchZoom,
  applyWheelZoom,
  clampZoom,
  keyPanDelta,
  pointerDistance,
} from './camera-controls';
import { FogOverlay } from './fog-overlay';
import {
  OCEAN_ANIMATION_FRAMERATE,
  OCEAN_ANIMATION_FRAMES,
  OCEAN_ANIMATION_KEY,
  TILE_RENDER_SCALE,
  frameForTile,
  mapWorldBounds,
  tileCenterInWorld,
} from './tile-atlas';

// Depth of the fog overlay — above all terrain tiles but below any
// future HUD-anchored in-world indicators (selection rings, damage
// numbers) which will claim higher depths.
export const FOG_OVERLAY_DEPTH = 100;

export interface GameSceneInitData {
  readonly map: GameMap;
  // Optional camera focus (tile coords). Defaults to map centre — or
  // to the last remembered camera view from the store, if any.
  readonly cameraFocus?: { x: number; y: number };
  // Per-faction visibility grid. When present, a fog overlay is
  // rendered on top of the terrain; omitting it leaves the full map
  // visible (useful for tests and the upcoming Rayon Passage preview).
  readonly visibility?: FactionVisibility;
}

export class GameScene extends Phaser.Scene {
  private mapModel: GameMap | null = null;
  private initialVisibility: FactionVisibility | null = null;
  private fogOverlay: FogOverlay | null = null;
  // Follow target is a lightweight invisible sprite — Phaser cameras
  // follow GameObjects, not bare coords.
  private followTarget: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  // Pinch state — populated when two pointers are down.
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;

  constructor() {
    super({ key: SCENE_KEYS.game });
  }

  init(data: Partial<GameSceneInitData>): void {
    this.mapModel = data.map ?? null;
    this.initialVisibility = data.visibility ?? null;
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
    this.setupCameraControls();

    const visibility = this.initialVisibility ?? data.visibility;
    if (visibility) {
      this.fogOverlay = new FogOverlay(this, map.width, map.height, visibility).setDepth(
        FOG_OVERLAY_DEPTH,
      );
    }
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

    // If the caller supplied no explicit focus and the store has a
    // remembered view from earlier in this game session, restore it
    // (overriding the default map-centre focus).
    if (!focus) {
      const stored = useGameStore.getState().cameraView;
      if (stored) {
        cam.stopFollow();
        cam.setZoom(clampZoom(stored.zoom));
        cam.setScroll(stored.scrollX, stored.scrollY);
      }
    }
  }

  private setupCameraControls(): void {
    this.input.addPointer(2);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);

    // Persist the initial state so the store always reflects the
    // active view — even before the player touches anything.
    this.persistCameraView();
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const { pointer1, pointer2 } = this.input;
    const twoDown = pointer1.isDown && pointer2.isDown;

    if (twoDown) {
      this.handlePinch(pointer1, pointer2);
      return;
    }

    if (!pointer.isDown) return;

    // Single-pointer drag: shift the camera by the inverse of the
    // pointer delta in screen space, scaled by zoom so the world
    // tracks the finger / cursor 1:1.
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setScroll(
      cam.scrollX - (pointer.x - pointer.prevPosition.x) / cam.zoom,
      cam.scrollY - (pointer.y - pointer.prevPosition.y) / cam.zoom,
    );
    this.persistCameraView();
  }

  private handlePointerUp(): void {
    // End any in-flight pinch when either pointer lifts.
    this.pinchStartDistance = 0;
    this.persistCameraView();
  }

  private handlePinch(p1: Phaser.Input.Pointer, p2: Phaser.Input.Pointer): void {
    const cam = this.cameras.main;
    const dist = pointerDistance({ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });

    if (this.pinchStartDistance === 0) {
      this.pinchStartDistance = dist;
      this.pinchStartZoom = cam.zoom;
      return;
    }

    cam.stopFollow();
    const newZoom = applyPinchZoom(this.pinchStartZoom, this.pinchStartDistance, dist);
    cam.setZoom(newZoom);
    this.persistCameraView();
  }

  private handleWheel(
    pointer: Phaser.Input.Pointer,
    _objects: Phaser.GameObjects.GameObject[],
    _dx: number,
    deltaY: number,
  ): void {
    const cam = this.cameras.main;
    const oldZoom = cam.zoom;
    const newZoom = applyWheelZoom(oldZoom, deltaY);
    if (newZoom === oldZoom) return;

    // Anchor zoom on the cursor so the tile under the pointer stays
    // under the pointer — the standard map-app feel.
    const worldX = cam.scrollX + pointer.x / oldZoom;
    const worldY = cam.scrollY + pointer.y / oldZoom;
    cam.stopFollow();
    cam.setZoom(newZoom);
    cam.setScroll(worldX - pointer.x / newZoom, worldY - pointer.y / newZoom);
    this.persistCameraView();
  }

  update(time: number, delta: number): void {
    this.fogOverlay?.update(time);

    if (!this.cursors) return;
    const keys = {
      up: !!this.cursors.up?.isDown,
      down: !!this.cursors.down?.isDown,
      left: !!this.cursors.left?.isDown,
      right: !!this.cursors.right?.isDown,
    };
    if (!keys.up && !keys.down && !keys.left && !keys.right) return;

    const cam = this.cameras.main;
    const { dx, dy } = keyPanDelta(keys, delta, cam.zoom);
    if (dx === 0 && dy === 0) return;

    cam.stopFollow();
    cam.setScroll(cam.scrollX + dx, cam.scrollY + dy);
    this.persistCameraView();
  }

  // Public hook for callers that own the visibility model (e.g. the
  // turn-advance flow, or tests) to push a fresh snapshot into the
  // overlay. No-op when the scene has no fog overlay configured.
  syncFogOverlay(visibility: FactionVisibility): void {
    this.fogOverlay?.sync(visibility, this.time.now);
  }

  private persistCameraView(): void {
    const cam = this.cameras.main;
    useGameStore.getState().setCameraView({
      scrollX: cam.scrollX,
      scrollY: cam.scrollY,
      zoom: cam.zoom,
    });
  }

  // Moves the camera follow target to a new tile. Public so HUD /
  // selection flows in later tasks can recenter the view (e.g. "jump
  // to colony"). Safe to call before or after create. Re-engages
  // follow so the camera glides to the new focus even if the player
  // had previously taken manual control.
  setCameraFocus(tileX: number, tileY: number): void {
    if (!this.mapModel || !this.followTarget) return;
    const tx = Math.max(0, Math.min(this.mapModel.width - 1, tileX));
    const ty = Math.max(0, Math.min(this.mapModel.height - 1, tileY));
    const { x, y } = tileCenterInWorld(tx, ty);
    this.followTarget.setPosition(x, y);
    this.cameras.main.startFollow(this.followTarget, true, 0.1, 0.1);
  }
}

// Re-export camera tuning constants for any caller that wants to wire
// HUD readouts (e.g. a "zoom level" indicator) without reaching into
// the controls module directly.
export { CAMERA_MAX_ZOOM, CAMERA_MIN_ZOOM };
