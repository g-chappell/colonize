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
}
