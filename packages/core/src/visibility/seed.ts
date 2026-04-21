import type { GameMap } from '../map/map.js';
import { TileType } from '../map/tile.js';
import type { FactionVisibility } from './visibility.js';

/**
 * Seed a faction's turn-0 visibility so every Rayon Passage tile and
 * floating-city node is at least `seen`. The Rayon Passage is the known sea
 * route connecting the chain of floating cities — the spine of civilisation,
 * common knowledge before the game begins. Everything else stays `unseen`
 * until a unit sights it.
 *
 * Intended to be called on a freshly-constructed `FactionVisibility` (all
 * cells `unseen`) before any per-unit LoS reveals run. Calling after LoS
 * reveals would demote those newly-visible cells to `seen`; the turn-loop
 * pipeline is: construct → seed corridor → reveal from units.
 */
export function seedStartingCorridorKnowledge(vis: FactionVisibility, map: GameMap): void {
  if (vis.width !== map.width || vis.height !== map.height) {
    throw new RangeError(
      `visibility grid (${vis.width}x${vis.height}) does not match map (${map.width}x${map.height})`,
    );
  }
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.get(x, y);
      if (t === TileType.RayonPassage || t === TileType.FloatingCity) {
        vis.reveal({ x, y }, 0);
      }
    }
  }
  vis.demoteVisibleToSeen();
}
