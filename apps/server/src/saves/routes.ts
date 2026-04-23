// Cloud-save routes plugin — registers PUT /saves/:slot and GET
// /saves/:slot on the supplied Fastify instance. Both endpoints gate on
// the session cookie issued by the auth plugin (see apps/server/src/
// auth/routes.ts); an unauthenticated request is answered 401 without
// touching the repository.
//
// The payload is opaque to the server — the wire shape is declared as
// `z.unknown()` in @colonize/shared so a save-format revision in
// @colonize/core never forces a server schema bump. The server only
// tracks the version counter + timestamp and enforces last-writer-wins
// via the repository.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import {
  ErrorResponse,
  GetSaveResponse,
  PutSaveRequest,
  PutSaveResponse,
  SaveSlotId,
} from '@colonize/shared';
import type { AuthRepository } from '../auth/repository.js';
import type { SaveRepository } from './repository.js';

export interface SaveRoutesOptions {
  saves: SaveRepository;
  /** Session-lookup path, reused from the auth plugin. */
  auth: AuthRepository;
  /** Cookie carrying the session token; mirrors the auth plugin's value. */
  sessionCookieName: string;
  /** Override clock for tests. */
  now?: () => Date;
}

export async function registerSaveRoutes(
  app: FastifyInstance,
  opts: SaveRoutesOptions,
): Promise<void> {
  const now = opts.now ?? (() => new Date());

  async function resolveSessionUserId(req: FastifyRequest): Promise<string | null> {
    const token = req.cookies[opts.sessionCookieName];
    if (!token) return null;
    const session = await opts.auth.findActiveSession(token, now());
    return session?.userId ?? null;
  }

  function parseSlot(
    reply: FastifyReply,
    raw: unknown,
  ): { ok: true; slot: string } | { ok: false } {
    const parsed = SaveSlotId.safeParse(raw);
    if (!parsed.success) {
      sendError(reply, 400, 'invalid_slot', 'slot must match /^[a-z0-9_-]+$/ (1–32 chars)');
      return { ok: false };
    }
    return { ok: true, slot: parsed.data };
  }

  app.put<{ Params: { slot: string } }>('/saves/:slot', async (req, reply) => {
    const userId = await resolveSessionUserId(req);
    if (!userId) {
      return sendError(reply, 401, 'unauthenticated', 'no active session');
    }

    const slotParse = parseSlot(reply, req.params.slot);
    if (!slotParse.ok) return reply;
    const slot = slotParse.slot;

    const body = PutSaveRequest.safeParse(req.body);
    if (!body.success) {
      return sendError(reply, 400, 'invalid_request', 'version must be a positive integer');
    }

    const result = await opts.saves.put({
      userId,
      slot,
      version: body.data.version,
      payload: body.data.payload,
      now: now(),
    });

    if (!result.ok) {
      return reply.code(409).send(
        GetSaveResponse.parse({
          slot: result.current.slot,
          version: result.current.version,
          updatedAt: result.current.updatedAt.toISOString(),
          payload: result.current.payload,
        }),
      );
    }

    return reply.code(200).send(
      PutSaveResponse.parse({
        slot: result.record.slot,
        version: result.record.version,
        updatedAt: result.record.updatedAt.toISOString(),
      }),
    );
  });

  app.get<{ Params: { slot: string } }>('/saves/:slot', async (req, reply) => {
    const userId = await resolveSessionUserId(req);
    if (!userId) {
      return sendError(reply, 401, 'unauthenticated', 'no active session');
    }

    const slotParse = parseSlot(reply, req.params.slot);
    if (!slotParse.ok) return reply;
    const slot = slotParse.slot;

    const record = await opts.saves.get(userId, slot);
    if (!record) {
      return sendError(reply, 404, 'not_found', `no save at slot "${slot}"`);
    }

    return reply.code(200).send(
      GetSaveResponse.parse({
        slot: record.slot,
        version: record.version,
        updatedAt: record.updatedAt.toISOString(),
        payload: record.payload,
      }),
    );
  });
}

function sendError(
  reply: FastifyReply,
  status: number,
  error: string,
  message: string,
): FastifyReply {
  return reply.code(status).send(ErrorResponse.parse({ error, message }));
}
