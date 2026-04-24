import type Phaser from 'phaser';
import {
  FRONTIER_MOTIF_ALPHA,
  FRONTIER_MOTIF_COLOR_HEX,
  FRONTIER_MOTIF_DENSITY,
  pickFrontierMotto,
} from '@colonize/content';
import type { FactionVisibility } from '@colonize/core';

import { computeFrontierMotifPlacements } from './fog-edge-motif';
import { renderedTileSize, tileCenterInWorld } from './tile-atlas';

function hexStringToNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

// Renders the "hic sunt dracones" motif — a faint text motto and a
// small coiled-serpent sigil — on a deterministically sparse subset of
// fog-of-war edge tiles. Flavour only; no input handling, no mechanics.
// Draws above the fog overlay so the motif is visible through the
// opaque Unseen fill.
export class FogEdgeMotifLayer {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, initialVisibility: FactionVisibility) {
    this.scene = scene;
    this.layer = scene.add.container(0, 0).setName('fog-edge-motif-layer');
    this.render(initialVisibility);
  }

  sync(visibility: FactionVisibility): void {
    this.render(visibility);
  }

  setDepth(depth: number): this {
    this.layer.setDepth(depth);
    return this;
  }

  destroy(): void {
    this.layer.destroy();
  }

  private render(visibility: FactionVisibility): void {
    this.layer.removeAll(true);
    const placements = computeFrontierMotifPlacements(visibility, FRONTIER_MOTIF_DENSITY);
    const tilePx = renderedTileSize();
    for (const p of placements) {
      const { x: cx, y: cy } = tileCenterInWorld(p.x, p.y);
      const motto = pickFrontierMotto(p.seed);

      const sigil = this.buildSigil(tilePx);
      const text = this.scene.add.text(0, tilePx * 0.22, motto, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: `${Math.max(6, Math.round(tilePx * 0.2))}px`,
        fontStyle: 'italic',
        color: FRONTIER_MOTIF_COLOR_HEX,
        align: 'center',
      });
      text.setOrigin(0.5, 0.5);

      const tile = this.scene.add.container(cx, cy, [sigil, text]);
      tile.setAlpha(FRONTIER_MOTIF_ALPHA);
      this.layer.add(tile);
    }
  }

  // Small stylised serpent-coil drawn as a Graphics polyline — a coiled
  // tail with a triangular head pointing right. Kept deliberately
  // primitive: the art epic will replace this with a proper sigil.
  private buildSigil(tilePx: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const color = hexStringToNumber(FRONTIER_MOTIF_COLOR_HEX);
    const r = tilePx * 0.14;
    g.lineStyle(1, color, 1);
    // Coil: two arcs forming an S.
    g.beginPath();
    g.arc(-r * 0.5, -r * 0.2, r * 0.5, Math.PI, 0, true);
    g.arc(r * 0.5, -r * 0.2, r * 0.5, Math.PI, 0, false);
    g.strokePath();
    // Triangular fang at the right end of the S.
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(r * 1.0, -r * 0.2);
    g.lineTo(r * 1.4, -r * 0.5);
    g.lineTo(r * 1.4, r * 0.1);
    g.closePath();
    g.fillPath();
    return g;
  }
}
