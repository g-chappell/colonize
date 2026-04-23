import { z } from 'zod';

export const SHARED_SCHEMA_VERSION = 1;

export const HealthResponse = z.object({
  ok: z.boolean(),
  version: z.string(),
  uptime: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;

// --- Auth & account (server endpoints in apps/server) ---

// Public-facing user shape returned by /me and /auth/verify. Never carries
// credentials, magic-link tokens, or session tokens.
export const User = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof User>;

// POST /auth/magic-link
export const MagicLinkRequest = z.object({
  email: z.string().email(),
});
export type MagicLinkRequest = z.infer<typeof MagicLinkRequest>;

export const MagicLinkResponse = z.object({
  ok: z.literal(true),
});
export type MagicLinkResponse = z.infer<typeof MagicLinkResponse>;

// POST /auth/verify
export const VerifyRequest = z.object({
  token: z.string().min(1),
});
export type VerifyRequest = z.infer<typeof VerifyRequest>;

export const VerifyResponse = z.object({
  user: User,
});
export type VerifyResponse = z.infer<typeof VerifyResponse>;

// GET /me
export const MeResponse = z.object({
  user: User,
});
export type MeResponse = z.infer<typeof MeResponse>;

// Generic error envelope used by the auth endpoints (and reusable for any
// future endpoint that wants a typed failure shape on the wire).
export const ErrorResponse = z.object({
  error: z.string().min(1),
  message: z.string().min(1),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

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
