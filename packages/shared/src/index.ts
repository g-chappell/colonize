import { z } from 'zod';

export const SHARED_SCHEMA_VERSION = 1;

export const HealthResponse = z.object({
  ok: z.boolean(),
  version: z.string(),
  uptime: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;

// Event payloads for the web client's pub/sub bus (apps/web/src/bus.ts).
// Extend via declaration merging as HUD↔Phaser events are introduced.
export interface GameEvents {
  'turn:advanced': { turn: number };
  // Fired when the player selects a unit on the map (or clears the
  // selection by clicking empty water). `unitId` is null when nothing
  // is selected.
  'unit:selected': { unitId: string | null };
  // Emitted by the React pause overlay so the GameCanvas host can call
  // phaser.scene.pause() / .resume() on the running GameScene. Keeps
  // React ignorant of the Phaser instance and leaves the scene-lifecycle
  // wiring in one place (GameCanvas).
  'game:pause': Record<string, never>;
  'game:resume': Record<string, never>;
  // Fired when the player clicks a colony sprite on the map. The
  // GameCanvas host listens and routes to the colony-overlay screen
  // via the zustand store. `colonyId` is null for an explicit clear
  // (reserved — no current emitter).
  'colony:selected': { colonyId: string | null };
}
