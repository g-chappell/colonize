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

// --- Cloud save (server endpoints in apps/server) ---

// Slot identifier. Kept narrow enough to be URL-safe and short enough to
// index in Postgres without a TEXT column; the server rejects anything
// outside `[a-z0-9_-]{1,32}`.
export const SaveSlotId = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9_-]+$/, 'slot must match /^[a-z0-9_-]+$/');
export type SaveSlotId = z.infer<typeof SaveSlotId>;

// Opaque payload — the server never introspects save contents; it only
// tracks the version + the last-written JSON blob. Widened as `unknown`
// so a future save-format migration inside @colonize/core doesn't force
// a shared schema bump.
export const SavePayload = z.unknown();
export type SavePayload = z.infer<typeof SavePayload>;

// PUT /saves/:slot — client writes a save at a slot. `version` is a
// monotonically increasing integer owned by the client; the server
// rejects writes whose version is <= the server's current version for
// that (user, slot) pair with `stale_version` so a stale tab cannot
// clobber a newer save written from another device.
export const PutSaveRequest = z.object({
  version: z.number().int().positive(),
  payload: SavePayload,
});
export type PutSaveRequest = z.infer<typeof PutSaveRequest>;

export const PutSaveResponse = z.object({
  slot: SaveSlotId,
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
});
export type PutSaveResponse = z.infer<typeof PutSaveResponse>;

// GET /saves/:slot — client reads the latest save at a slot. Returns
// 404 when no save has ever been written for (user, slot).
export const GetSaveResponse = z.object({
  slot: SaveSlotId,
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  payload: SavePayload,
});
export type GetSaveResponse = z.infer<typeof GetSaveResponse>;

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
