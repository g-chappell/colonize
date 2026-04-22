import { GameMap, type Coord } from './map.js';
import { TileType } from './tile.js';
import { ALL_DIRECTIONS, type Direction } from './direction.js';
import { DirectionLayer } from './direction-layer.js';
import { ALL_RUMOUR_KINDS, RumourTile } from '../rumour/rumour.js';

export interface GenerateMapOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly factionCount?: number;
}

export interface GeneratedMap {
  readonly map: GameMap;
  readonly factionStarts: readonly Coord[];
  readonly rumours: readonly RumourTile[];
  readonly wind: DirectionLayer;
  readonly current: DirectionLayer;
}

export const MIN_MAP_WIDTH = 20;
export const MIN_MAP_HEIGHT = 15;
export const MAX_FACTION_COUNT = 8;

export function generateMap(options: GenerateMapOptions): GeneratedMap {
  if (!Number.isInteger(options.seed)) {
    throw new TypeError(`seed must be an integer (got ${String(options.seed)})`);
  }
  if (!Number.isInteger(options.width) || options.width < MIN_MAP_WIDTH) {
    throw new RangeError(
      `width must be an integer >= ${MIN_MAP_WIDTH} (got ${String(options.width)})`,
    );
  }
  if (!Number.isInteger(options.height) || options.height < MIN_MAP_HEIGHT) {
    throw new RangeError(
      `height must be an integer >= ${MIN_MAP_HEIGHT} (got ${String(options.height)})`,
    );
  }
  const factionCount = options.factionCount ?? 0;
  if (!Number.isInteger(factionCount) || factionCount < 0 || factionCount > MAX_FACTION_COUNT) {
    throw new RangeError(
      `factionCount must be an integer in [0, ${MAX_FACTION_COUNT}] (got ${String(
        options.factionCount,
      )})`,
    );
  }

  const rng = mulberry32(options.seed);
  const map = new GameMap(options.width, options.height, TileType.Ocean);

  const corridor = carveRayonPassage(map, rng);
  placeFloatingCities(map, rng, corridor);
  scatterIslands(map, rng);
  placeRedTideZones(map, rng);
  scatterFataMorgana(map, rng);
  const factionStarts = pickFactionStarts(map, rng, factionCount);
  const rumours = scatterRumours(map, rng, factionStarts);
  const wind = seedDirectionZones(
    map,
    rng,
    WIND_ZONE_MIN,
    WIND_ZONE_MAX,
    WIND_ZONE_SIZE_MIN,
    WIND_ZONE_SIZE_MAX,
  );
  const current = seedDirectionZones(
    map,
    rng,
    CURRENT_ZONE_MIN,
    CURRENT_ZONE_MAX,
    CURRENT_ZONE_SIZE_MIN,
    CURRENT_ZONE_SIZE_MAX,
  );

  return { map, factionStarts, rumours, wind, current };
}

const RUMOUR_MIN_COUNT = 4;
const RUMOUR_MAX_COUNT = 8;
const RUMOUR_START_KEEP_OUT = 3;

const WIND_ZONE_MIN = 2;
const WIND_ZONE_MAX = 4;
const WIND_ZONE_SIZE_MIN = 6;
const WIND_ZONE_SIZE_MAX = 14;

const CURRENT_ZONE_MIN = 1;
const CURRENT_ZONE_MAX = 3;
const CURRENT_ZONE_SIZE_MIN = 4;
const CURRENT_ZONE_SIZE_MAX = 10;

// Mulberry32: small, fast, well-distributed 32-bit PRNG. Deterministic for a given seed.
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function carveRayonPassage(map: GameMap, rng: () => number): Coord[] {
  const path: Coord[] = [];
  let y = Math.floor(map.height / 2);
  const minY = 2;
  const maxY = map.height - 3;
  for (let x = 0; x < map.width; x++) {
    map.set(x, y, TileType.RayonPassage);
    path.push({ x, y });
    const r = rng();
    if (r < 0.15 && y > minY) y--;
    else if (r < 0.3 && y < maxY) y++;
  }
  return path;
}

function placeFloatingCities(map: GameMap, rng: () => number, corridor: Coord[]): void {
  const count = randInt(rng, 5, 8);
  const step = Math.floor(corridor.length / (count + 1));
  const jitterSpan = Math.max(0, Math.floor(step / 3));
  const placed = new Set<string>();
  for (let i = 1; i <= count; i++) {
    const jitter = jitterSpan === 0 ? 0 : randInt(rng, -jitterSpan, jitterSpan);
    let idx = Math.max(0, Math.min(corridor.length - 1, i * step + jitter));
    // Skip over existing cities to keep the count exact.
    for (let tries = 0; tries < corridor.length; tries++) {
      const p = corridor[idx]!;
      const key = `${p.x},${p.y}`;
      if (!placed.has(key)) {
        map.set(p.x, p.y, TileType.FloatingCity);
        placed.add(key);
        break;
      }
      idx = (idx + 1) % corridor.length;
    }
  }
}

function scatterIslands(map: GameMap, rng: () => number): void {
  const count = randInt(rng, 8, 15);
  for (let i = 0; i < count; i++) {
    const origin = findRandomOceanCell(map, rng);
    if (!origin) return;
    const size = randInt(rng, 1, 12);
    growBlob(map, rng, origin, size, TileType.Island);
  }
}

function placeRedTideZones(map: GameMap, rng: () => number): void {
  const count = randInt(rng, 1, 3);
  for (let i = 0; i < count; i++) {
    const origin = findRandomOceanCell(map, rng);
    if (!origin) return;
    const size = randInt(rng, 3, 8);
    growBlob(map, rng, origin, size, TileType.RedTide);
  }
}

function scatterFataMorgana(map: GameMap, rng: () => number): void {
  const count = randInt(rng, 3, 6);
  let placed = 0;
  for (let attempt = 0; attempt < count * 20 && placed < count; attempt++) {
    const c = findRandomOceanCell(map, rng);
    if (!c) break;
    map.set(c.x, c.y, TileType.FataMorgana);
    placed++;
  }
}

function growBlob(
  map: GameMap,
  rng: () => number,
  origin: Coord,
  targetSize: number,
  type: TileType,
): void {
  const cells: Coord[] = [origin];
  map.set(origin.x, origin.y, type);
  const maxStalls = targetSize * 3;
  let stalls = 0;
  while (cells.length < targetSize && stalls < maxStalls) {
    const anchor = cells[Math.floor(rng() * cells.length)]!;
    const candidates = map
      .neighbours(anchor.x, anchor.y)
      .filter((n) => map.get(n.x, n.y) === TileType.Ocean);
    if (candidates.length === 0) {
      stalls++;
      continue;
    }
    const pick = candidates[Math.floor(rng() * candidates.length)]!;
    map.set(pick.x, pick.y, type);
    cells.push(pick);
  }
}

function findRandomOceanCell(map: GameMap, rng: () => number): Coord | null {
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(rng() * map.width);
    const y = Math.floor(rng() * map.height);
    if (map.get(x, y) === TileType.Ocean) return { x, y };
  }
  return null;
}

function pickFactionStarts(map: GameMap, rng: () => number, count: number): Coord[] {
  if (count === 0) return [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const used = new Set<string>();
  const result: Coord[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = Math.floor(((col + 0.5) * map.width) / cols);
    const cy = Math.floor(((row + 0.5) * map.height) / rows);
    const jx = randInt(rng, -2, 2);
    const jy = randInt(rng, -2, 2);
    const sx = Math.max(0, Math.min(map.width - 1, cx + jx));
    const sy = Math.max(0, Math.min(map.height - 1, cy + jy));
    const found = nearestOcean(map, sx, sy, used);
    if (!found) {
      throw new Error(
        `could not place faction start #${i + 1} near (${sx}, ${sy}) — map has no reachable Ocean`,
      );
    }
    used.add(`${found.x},${found.y}`);
    result.push(found);
  }
  return result;
}

function scatterRumours(
  map: GameMap,
  rng: () => number,
  factionStarts: readonly Coord[],
): RumourTile[] {
  const target = randInt(rng, RUMOUR_MIN_COUNT, RUMOUR_MAX_COUNT);
  const placed: RumourTile[] = [];
  const used = new Set<string>();
  for (const s of factionStarts) used.add(`${s.x},${s.y}`);
  const maxAttempts = target * 50;
  for (let attempt = 0; attempt < maxAttempts && placed.length < target; attempt++) {
    const x = Math.floor(rng() * map.width);
    const y = Math.floor(rng() * map.height);
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    if (map.get(x, y) !== TileType.Ocean) continue;
    if (nearAnyStart(x, y, factionStarts, RUMOUR_START_KEEP_OUT)) continue;
    used.add(key);
    const kind = ALL_RUMOUR_KINDS[Math.floor(rng() * ALL_RUMOUR_KINDS.length)]!;
    placed.push(
      new RumourTile({
        id: `rumour-${placed.length}`,
        position: { x, y },
        kind,
      }),
    );
  }
  return placed;
}

function nearAnyStart(x: number, y: number, starts: readonly Coord[], radius: number): boolean {
  for (const s of starts) {
    if (Math.max(Math.abs(s.x - x), Math.abs(s.y - y)) <= radius) return true;
  }
  return false;
}

function seedDirectionZones(
  map: GameMap,
  rng: () => number,
  minCount: number,
  maxCount: number,
  minSize: number,
  maxSize: number,
): DirectionLayer {
  const layer = new DirectionLayer(map.width, map.height);
  const count = randInt(rng, minCount, maxCount);
  for (let i = 0; i < count; i++) {
    const origin = findRandomNavigableCell(map, rng);
    if (!origin) break;
    const size = randInt(rng, minSize, maxSize);
    const dir = ALL_DIRECTIONS[Math.floor(rng() * ALL_DIRECTIONS.length)] as Direction;
    growDirectionBlob(map, layer, rng, origin, size, dir);
  }
  return layer;
}

function growDirectionBlob(
  map: GameMap,
  layer: DirectionLayer,
  rng: () => number,
  origin: Coord,
  targetSize: number,
  dir: Direction,
): void {
  const cells: Coord[] = [origin];
  layer.set(origin.x, origin.y, dir);
  const maxStalls = targetSize * 3;
  let stalls = 0;
  while (cells.length < targetSize && stalls < maxStalls) {
    const anchor = cells[Math.floor(rng() * cells.length)]!;
    const candidates = map
      .neighbours(anchor.x, anchor.y)
      .filter((n) => isNavigable(map.get(n.x, n.y)) && layer.get(n.x, n.y) === null);
    if (candidates.length === 0) {
      stalls++;
      continue;
    }
    const pick = candidates[Math.floor(rng() * candidates.length)]!;
    layer.set(pick.x, pick.y, dir);
    cells.push(pick);
  }
}

function findRandomNavigableCell(map: GameMap, rng: () => number): Coord | null {
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(rng() * map.width);
    const y = Math.floor(rng() * map.height);
    if (isNavigable(map.get(x, y))) return { x, y };
  }
  return null;
}

function isNavigable(type: TileType): boolean {
  return (
    type === TileType.Ocean ||
    type === TileType.RayonPassage ||
    type === TileType.FloatingCity ||
    type === TileType.FataMorgana
  );
}

function nearestOcean(
  map: GameMap,
  startX: number,
  startY: number,
  used: ReadonlySet<string>,
): Coord | null {
  const visited = new Set<string>();
  const queue: Coord[] = [{ x: startX, y: startY }];
  while (queue.length > 0) {
    const c = queue.shift()!;
    const key = `${c.x},${c.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (!map.inBounds(c.x, c.y)) continue;
    if (map.get(c.x, c.y) === TileType.Ocean && !used.has(key)) {
      return c;
    }
    for (const n of map.neighbours(c.x, c.y)) {
      if (!visited.has(`${n.x},${n.y}`)) queue.push(n);
    }
  }
  return null;
}
