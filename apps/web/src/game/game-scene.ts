import Phaser from 'phaser';
import { TileType, findPath, type ColonyJSON, type Coord, type UnitJSON } from '@colonize/core';
import type { FactionVisibility, GameMap, MerchantRouteJSON } from '@colonize/core';

import { bus } from '../bus';
import { useGameStore, type ProposedMove } from '../store/game';
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
import { pickColonyIdAtTile } from './colony-input';
import { FogOverlay } from './fog-overlay';
import { decideMoveClick } from './move-intent';
import { truncatePathResult } from './path-preview';
import { computeRouteSegments } from './route-layout';
import {
  OCEAN_ANIMATION_FRAMERATE,
  OCEAN_ANIMATION_FRAMES,
  OCEAN_ANIMATION_KEY,
  TILE_RENDER_SCALE,
  frameForTile,
  mapWorldBounds,
  renderedTileSize,
  tileCenterInWorld,
} from './tile-atlas';
import { findUnitById, isTileInBounds, worldToTile } from './unit-input';
import {
  SELECTION_RING_COLOR,
  SELECTION_RING_SCALE,
  UNIT_BODY_SCALE,
  colorForFaction,
  visualForUnitType,
} from './unit-visuals';

// Depth ordering: terrain tiles draw at the default depth (0),
// the path preview sits between terrain and units (so the unit sprite
// covers the preview dot under its own tile), colonies sit just above
// the preview but *below* units (so a unit garrisoning a colony reads
// as standing on top of the structure), the selection ring sits above
// units, and the fog overlay sits above everything so unseen units
// stay hidden behind the fog.
export const PATH_PREVIEW_DEPTH = 30;
export const ROUTE_LAYER_DEPTH = 35;
export const COLONY_LAYER_DEPTH = 40;
export const UNIT_LAYER_DEPTH = 50;
export const SELECTION_RING_DEPTH = 60;
export const FOG_OVERLAY_DEPTH = 100;

// Merchant-route line visuals — drawn between sequential route stops
// on the Phaser map so the player sees their trade loops at a glance.
// Colour matches the HUD gold palette; alpha keeps the lines readable
// without drowning the terrain.
export const ROUTE_LINE_COLOR = 0xd6b466;
export const ROUTE_LINE_WIDTH = 2;
export const ROUTE_LINE_ALPHA = 0.55;

// Colony body sized just larger than the tile-fill scale so the
// structure reads as more permanent than a unit silhouette but doesn't
// spill into adjacent tiles.
const COLONY_BODY_SCALE = 0.78;
const COLONY_FILL_COLOR = 0x6b4a2a;
const COLONY_STROKE_COLOR = 0xd6b466;

// Path preview visual tuning. Reachable tiles draw as solid gold dots,
// beyond-reach tiles as dim dots at the same radius so the player can
// see the whole route but understands where the unit will actually
// stop this turn. Colour matches the selection ring's amber so the
// preview reads as "this selection's plan".
export const PATH_PREVIEW_DOT_SCALE = 0.18;
export const PATH_PREVIEW_REACHABLE_COLOR = 0xf5c158;
export const PATH_PREVIEW_BEYOND_COLOR = 0x7a5b1f;
export const PATH_PREVIEW_BEYOND_ALPHA = 0.45;

// Per-tile step duration for the move-commit tween. Chosen so a
// 4-tile move (one full Sloop turn) lands in ~720ms — fast enough to
// keep the pace snappy, slow enough to read as motion rather than
// teleport.
export const MOVE_STEP_MS = 180;

// Pointer displacement (in screen pixels) above which a pointerup is
// treated as the end of a drag rather than a click. Keeps trembly
// touch taps from being eaten by the camera-drag handler.
const CLICK_PIXEL_THRESHOLD = 6;

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

  // Track pointer-down screen position so pointerup can decide whether
  // the gesture was a tap (→ click-to-select) or a drag (→ camera move).
  private pointerDownScreen: { x: number; y: number } | null = null;

  // Per-unit visual containers, keyed by UnitJSON.id. Diffed on every
  // store roster update — added on insert, repositioned on move,
  // destroyed on removal.
  private unitContainers = new Map<string, Phaser.GameObjects.Container>();
  private colonyContainers = new Map<string, Phaser.GameObjects.Container>();
  private selectionRing: Phaser.GameObjects.Graphics | null = null;
  private pathPreview: Phaser.GameObjects.Graphics | null = null;
  private unsubscribeUnits: (() => void) | null = null;
  private unsubscribeSelection: (() => void) | null = null;
  private unsubscribeProposedMove: (() => void) | null = null;
  private unsubscribeColonies: (() => void) | null = null;
  private routeLines: Phaser.GameObjects.Graphics | null = null;
  private unsubscribeRoutes: (() => void) | null = null;
  // True while a commit tween is playing. Blocks further input so the
  // player can't stack moves on a mid-flight sprite (which would race
  // the store commit that lands at tween end).
  private isMoving = false;

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
    this.setupColonyLayer();
    this.setupRouteLayer();
    this.setupUnitLayer();

    const visibility = this.initialVisibility ?? data.visibility;
    if (visibility) {
      this.fogOverlay = new FogOverlay(this, map.width, map.height, visibility).setDepth(
        FOG_OVERLAY_DEPTH,
      );
    }

    // Drop store subscriptions when the scene is torn down (e.g.
    // returning to the main menu) so listeners don't accumulate.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownUnitLayer, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardownUnitLayer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownColonyLayer, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardownColonyLayer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownRouteLayer, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardownRouteLayer, this);
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

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);

    // Persist the initial state so the store always reflects the
    // active view — even before the player touches anything.
    this.persistCameraView();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Record the screen-space anchor; pointerup compares against it
    // to decide tap-vs-drag. Two-finger gestures clear the anchor so
    // a pinch never resolves as a click on the second finger lift.
    if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
      this.pointerDownScreen = null;
      return;
    }
    this.pointerDownScreen = { x: pointer.x, y: pointer.y };
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

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    // End any in-flight pinch when either pointer lifts.
    this.pinchStartDistance = 0;
    this.persistCameraView();

    // Decide tap-vs-drag using the screen-pixel distance from the
    // original pointerdown. Below the threshold counts as a click.
    const anchor = this.pointerDownScreen;
    this.pointerDownScreen = null;
    if (!anchor) return;
    const dx = pointer.x - anchor.x;
    const dy = pointer.y - anchor.y;
    if (Math.hypot(dx, dy) > CLICK_PIXEL_THRESHOLD) return;

    this.handleMapClick(pointer);
  }

  private handleMapClick(pointer: Phaser.Input.Pointer): void {
    if (this.isMoving) return;
    if (!this.mapModel) return;
    const tile = worldToTile(pointer.worldX, pointer.worldY);
    if (!isTileInBounds(tile, this.mapModel.width, this.mapModel.height)) return;

    const state = useGameStore.getState();
    const intent = decideMoveClick({
      tile,
      units: state.units,
      selectedUnitId: state.selectedUnitId,
      proposedMove: state.proposedMove,
    });

    switch (intent.kind) {
      case 'select': {
        state.setSelectedUnit(intent.unitId);
        bus.emit('unit:selected', { unitId: intent.unitId });
        return;
      }
      case 'cancel-proposal': {
        if (state.proposedMove) state.setProposedMove(null);
        return;
      }
      case 'propose': {
        const unit = findUnitById(state.selectedUnitId, state.units);
        if (!unit) return;
        this.proposeMove(unit, intent.destination);
        return;
      }
      case 'commit': {
        const unit = findUnitById(state.selectedUnitId, state.units);
        if (!unit) return;
        this.commitProposedMove(unit, intent.proposal);
        return;
      }
      case 'none':
        // No unit-side action at this tile. If a colony sits here, the
        // click opens the colony view via the bus; otherwise it's a
        // genuine no-op. Colony-open is suppressed when a unit is
        // selected so move-target clicks (handled above as 'propose')
        // never compete with overlay-open intent.
        if (state.selectedUnitId === null) {
          const colonyId = pickColonyIdAtTile(tile, state.colonies);
          if (colonyId !== null) {
            bus.emit('colony:selected', { colonyId });
          }
        }
        return;
    }
  }

  private proposeMove(unit: UnitJSON, destination: Coord): void {
    const map = this.mapModel;
    if (!map) return;
    // Units with no remaining movement can still "propose" — the
    // preview shows the route and the reachable prefix is empty, so
    // a confirmation click will no-op rather than silently spend 0.
    const result = findPath(map, unit.position, destination, {});
    if (!result || result.path.length < 2) {
      useGameStore.getState().setProposedMove(null);
      return;
    }
    const truncated = truncatePathResult(result, map, {}, unit.movement);
    useGameStore.getState().setProposedMove({
      unitId: unit.id,
      path: result.path,
      cost: truncated.cost,
      reachable: truncated.reachable,
    });
  }

  private commitProposedMove(unit: UnitJSON, proposal: ProposedMove): void {
    // reachable === 0 means the unit can't afford even the first step.
    // Clear the proposal and stay put rather than burning a click.
    if (proposal.reachable <= 0) {
      useGameStore.getState().setProposedMove(null);
      return;
    }
    const waypoints = proposal.path.slice(0, proposal.reachable + 1);
    const finalTile = waypoints[waypoints.length - 1]!;
    this.animateMove(unit.id, waypoints, () => {
      useGameStore.getState().commitMove(unit.id, finalTile, proposal.cost);
      this.setCameraFocus(finalTile.x, finalTile.y);
    });
  }

  private animateMove(unitId: string, waypoints: readonly Coord[], onComplete: () => void): void {
    const container = this.unitContainers.get(unitId);
    if (!container || waypoints.length < 2) {
      onComplete();
      return;
    }
    // Hide the selection ring during the tween — it's drawn at the
    // unit's pre-move tile centre and can't gracefully follow a moving
    // container. syncSelectionRing redraws it at the new position once
    // commitMove fires.
    this.selectionRing?.setVisible(false);
    this.isMoving = true;

    const tweenNext = (i: number): void => {
      if (i >= waypoints.length) {
        this.isMoving = false;
        onComplete();
        return;
      }
      const wp = waypoints[i]!;
      const { x, y } = tileCenterInWorld(wp.x, wp.y);
      this.tweens.add({
        targets: container,
        x,
        y,
        duration: MOVE_STEP_MS,
        onComplete: () => tweenNext(i + 1),
      });
    };
    tweenNext(1);
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

  private setupColonyLayer(): void {
    const initial = useGameStore.getState();
    this.syncColonyContainers(initial.colonies);
    this.unsubscribeColonies = useGameStore.subscribe((state, prev) => {
      if (state.colonies === prev.colonies) return;
      this.syncColonyContainers(state.colonies);
      this.syncRouteLines(state.merchantRoutes, state.colonies);
    });
  }

  private teardownColonyLayer(): void {
    this.unsubscribeColonies?.();
    this.unsubscribeColonies = null;
    for (const container of this.colonyContainers.values()) {
      container.destroy();
    }
    this.colonyContainers.clear();
  }

  private setupRouteLayer(): void {
    this.routeLines = this.add.graphics();
    this.routeLines.setDepth(ROUTE_LAYER_DEPTH);
    const initial = useGameStore.getState();
    this.syncRouteLines(initial.merchantRoutes, initial.colonies);
    this.unsubscribeRoutes = useGameStore.subscribe((state, prev) => {
      if (state.merchantRoutes === prev.merchantRoutes) return;
      this.syncRouteLines(state.merchantRoutes, state.colonies);
    });
  }

  private teardownRouteLayer(): void {
    this.unsubscribeRoutes?.();
    this.unsubscribeRoutes = null;
    this.routeLines?.destroy();
    this.routeLines = null;
  }

  private syncRouteLines(
    routes: Readonly<Record<string, MerchantRouteJSON>>,
    colonies: readonly ColonyJSON[],
  ): void {
    const g = this.routeLines;
    if (!g) return;
    g.clear();
    const segments = computeRouteSegments(routes, colonies);
    if (segments.length === 0) {
      g.setVisible(false);
      return;
    }
    g.lineStyle(ROUTE_LINE_WIDTH, ROUTE_LINE_COLOR, ROUTE_LINE_ALPHA);
    for (const seg of segments) {
      const from = tileCenterInWorld(seg.from.x, seg.from.y);
      const to = tileCenterInWorld(seg.to.x, seg.to.y);
      g.lineBetween(from.x, from.y, to.x, to.y);
    }
    g.setVisible(true);
  }

  private syncColonyContainers(colonies: readonly ColonyJSON[]): void {
    const presentIds = new Set(colonies.map((c) => c.id));
    for (const [id, container] of this.colonyContainers) {
      if (!presentIds.has(id)) {
        container.destroy();
        this.colonyContainers.delete(id);
      }
    }
    for (const colony of colonies) {
      const existing = this.colonyContainers.get(colony.id);
      const { x, y } = tileCenterInWorld(colony.position.x, colony.position.y);
      if (existing) {
        existing.setPosition(x, y);
        continue;
      }
      this.colonyContainers.set(colony.id, this.createColonyContainer(colony, x, y));
    }
  }

  private createColonyContainer(
    colony: ColonyJSON,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const tilePx = renderedTileSize();
    const bodyPx = tilePx * COLONY_BODY_SCALE;
    const body = this.add.rectangle(0, 0, bodyPx, bodyPx, COLONY_FILL_COLOR);
    body.setStrokeStyle(2, COLONY_STROKE_COLOR);
    const initial = (colony.id[0] ?? '?').toUpperCase();
    const label = this.add
      .text(0, 0, initial, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: `${Math.round(bodyPx * 0.55)}px`,
        color: '#f4ecd8',
      })
      .setOrigin(0.5, 0.5);
    const container = this.add.container(x, y, [body, label]);
    container.setDepth(COLONY_LAYER_DEPTH);
    container.setSize(bodyPx, bodyPx);
    container.setData('colonyId', colony.id);
    return container;
  }

  private setupUnitLayer(): void {
    this.pathPreview = this.add.graphics();
    this.pathPreview.setDepth(PATH_PREVIEW_DEPTH);
    this.pathPreview.setVisible(false);

    this.selectionRing = this.add.graphics();
    this.selectionRing.setDepth(SELECTION_RING_DEPTH);
    this.selectionRing.setVisible(false);

    const initial = useGameStore.getState();
    this.syncUnitContainers(initial.units);
    this.syncSelectionRing(initial.selectedUnitId, initial.units);
    this.renderPathPreview(initial.proposedMove);

    this.unsubscribeUnits = useGameStore.subscribe((state, prev) => {
      if (state.units === prev.units) return;
      this.syncUnitContainers(state.units);
      this.syncSelectionRing(state.selectedUnitId, state.units);
    });
    this.unsubscribeSelection = useGameStore.subscribe((state, prev) => {
      if (state.selectedUnitId === prev.selectedUnitId) return;
      this.syncSelectionRing(state.selectedUnitId, state.units);
    });
    this.unsubscribeProposedMove = useGameStore.subscribe((state, prev) => {
      if (state.proposedMove === prev.proposedMove) return;
      this.renderPathPreview(state.proposedMove);
    });
  }

  private teardownUnitLayer(): void {
    this.unsubscribeUnits?.();
    this.unsubscribeUnits = null;
    this.unsubscribeSelection?.();
    this.unsubscribeSelection = null;
    this.unsubscribeProposedMove?.();
    this.unsubscribeProposedMove = null;
    for (const container of this.unitContainers.values()) {
      container.destroy();
    }
    this.unitContainers.clear();
    this.selectionRing?.destroy();
    this.selectionRing = null;
    this.pathPreview?.destroy();
    this.pathPreview = null;
  }

  private syncUnitContainers(units: readonly UnitJSON[]): void {
    const presentIds = new Set(units.map((u) => u.id));
    for (const [id, container] of this.unitContainers) {
      if (!presentIds.has(id)) {
        container.destroy();
        this.unitContainers.delete(id);
      }
    }
    for (const unit of units) {
      const existing = this.unitContainers.get(unit.id);
      const { x, y } = tileCenterInWorld(unit.position.x, unit.position.y);
      if (existing) {
        existing.setPosition(x, y);
        continue;
      }
      this.unitContainers.set(unit.id, this.createUnitContainer(unit, x, y));
    }
  }

  private createUnitContainer(unit: UnitJSON, x: number, y: number): Phaser.GameObjects.Container {
    const tilePx = renderedTileSize();
    const bodyPx = tilePx * UNIT_BODY_SCALE;
    const visual = visualForUnitType(unit.type);
    const fill = colorForFaction(unit.faction);

    const body = this.buildUnitBody(visual.shape, bodyPx, fill);
    const label = this.add
      .text(0, 0, visual.label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: `${Math.round(bodyPx * 0.55)}px`,
        color: '#f4ecd8',
      })
      .setOrigin(0.5, 0.5);

    const container = this.add.container(x, y, [body, label]);
    container.setDepth(UNIT_LAYER_DEPTH);
    container.setSize(bodyPx, bodyPx);
    container.setData('unitId', unit.id);
    return container;
  }

  private buildUnitBody(
    shape: ReturnType<typeof visualForUnitType>['shape'],
    bodyPx: number,
    fill: number,
  ): Phaser.GameObjects.GameObject {
    const stroke = 0x0c1e2b;
    if (shape === 'circle') {
      const arc = this.add.circle(0, 0, bodyPx / 2, fill);
      arc.setStrokeStyle(2, stroke);
      return arc;
    }
    if (shape === 'diamond') {
      // Rotate a square 45° to read as a diamond silhouette without
      // building a custom Polygon — kept simple on purpose.
      const square = this.add.rectangle(0, 0, bodyPx * 0.75, bodyPx * 0.75, fill);
      square.setStrokeStyle(2, stroke);
      square.setRotation(Math.PI / 4);
      return square;
    }
    const square = this.add.rectangle(0, 0, bodyPx, bodyPx, fill);
    square.setStrokeStyle(2, stroke);
    return square;
  }

  private syncSelectionRing(selectedUnitId: string | null, units: readonly UnitJSON[]): void {
    const ring = this.selectionRing;
    if (!ring) return;
    const unit = findUnitById(selectedUnitId, units);
    if (!unit) {
      ring.setVisible(false);
      return;
    }
    const { x, y } = tileCenterInWorld(unit.position.x, unit.position.y);
    const radius = (renderedTileSize() * SELECTION_RING_SCALE) / 2;
    ring.clear();
    ring.lineStyle(2, SELECTION_RING_COLOR, 1);
    ring.strokeCircle(x, y, radius);
    ring.setVisible(true);
  }

  private renderPathPreview(proposedMove: ProposedMove | null): void {
    const g = this.pathPreview;
    if (!g) return;
    g.clear();
    if (!proposedMove || proposedMove.path.length < 2) {
      g.setVisible(false);
      return;
    }
    const { path, reachable } = proposedMove;
    const dotRadius = renderedTileSize() * PATH_PREVIEW_DOT_SCALE;
    // Skip path[0] (origin tile) — the unit sprite already sits there.
    for (let i = 1; i < path.length; i++) {
      const tile = path[i]!;
      const { x, y } = tileCenterInWorld(tile.x, tile.y);
      if (i <= reachable) {
        g.fillStyle(PATH_PREVIEW_REACHABLE_COLOR, 1);
      } else {
        g.fillStyle(PATH_PREVIEW_BEYOND_COLOR, PATH_PREVIEW_BEYOND_ALPHA);
      }
      g.fillCircle(x, y, dotRadius);
    }
    g.setVisible(true);
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
