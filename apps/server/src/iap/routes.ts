// IAP routes plugin — registers POST /iap/verify-receipt and GET
// /me/entitlements on the supplied Fastify instance. Both endpoints
// gate on the session cookie issued by the auth plugin (see
// apps/server/src/auth/routes.ts); an unauthenticated request is
// answered 401 without touching the repository or the validator.
//
// The validator is injected as a dependency so tests can substitute
// a deterministic stub; the default production validator is the
// catalog-stub from ./validator.ts — real platform verification lands
// when the store accounts are provisioned.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import {
  Entitlements,
  EntitlementsResponse,
  ErrorResponse,
  VerifyReceiptRequest,
  VerifyReceiptResponse,
  type Entitlements as EntitlementsDto,
} from '@colonize/shared';
import type { AuthRepository } from '../auth/repository.js';
import type { EntitlementRecord, EntitlementRepository } from './repository.js';
import { validateReceipt, type ReceiptValidationInput } from './validator.js';

export interface IapRoutesOptions {
  entitlements: EntitlementRepository;
  /** Session-lookup path, reused from the auth plugin. */
  auth: AuthRepository;
  /** Cookie carrying the session token; mirrors the auth plugin's value. */
  sessionCookieName: string;
  /** Override clock for tests. */
  now?: () => Date;
  /**
   * Override the receipt validator for tests. Production calls
   * `validateReceipt` from ./validator.ts directly. Tests can inject a
   * stub that decides the outcome without touching the real catalog.
   */
  validate?: (input: ReceiptValidationInput) => ReturnType<typeof validateReceipt>;
}

export async function registerIapRoutes(
  app: FastifyInstance,
  opts: IapRoutesOptions,
): Promise<void> {
  const now = opts.now ?? (() => new Date());
  const validate = opts.validate ?? validateReceipt;

  async function resolveSessionUserId(req: FastifyRequest): Promise<string | null> {
    const token = req.cookies[opts.sessionCookieName];
    if (!token) return null;
    const session = await opts.auth.findActiveSession(token, now());
    return session?.userId ?? null;
  }

  app.post('/iap/verify-receipt', async (req, reply) => {
    const userId = await resolveSessionUserId(req);
    if (!userId) {
      return sendError(reply, 401, 'unauthenticated', 'no active session');
    }

    const parsed = VerifyReceiptRequest.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'invalid_request',
        'platform, productId, and receipt are required',
      );
    }

    const decision = validate(parsed.data);
    if (!decision.ok) {
      return sendError(reply, 400, decision.reason, reasonMessage(decision.reason));
    }

    await opts.entitlements.grant({
      userId,
      entitlement: decision.entitlement,
      productId: decision.productId,
      platform: parsed.data.platform,
      now: now(),
    });

    const records = await opts.entitlements.listForUser(userId);
    return reply.code(200).send(
      VerifyReceiptResponse.parse({
        entitlements: toDto(records),
      }),
    );
  });

  app.get('/me/entitlements', async (req, reply) => {
    const userId = await resolveSessionUserId(req);
    if (!userId) {
      return sendError(reply, 401, 'unauthenticated', 'no active session');
    }

    const records = await opts.entitlements.listForUser(userId);
    return reply.code(200).send(
      EntitlementsResponse.parse({
        entitlements: toDto(records),
      }),
    );
  });
}

// Collapse a bag of EntitlementRecord rows into the client-facing flag
// shape. New entitlements add a column here + a flag in
// @colonize/shared Entitlements; unknown rows are ignored so an old
// client reading a newer server never throws.
function toDto(records: readonly EntitlementRecord[]): EntitlementsDto {
  const ids = new Set(records.map((r) => r.entitlement));
  return Entitlements.parse({
    hasRemoveAds: ids.has('remove_ads'),
  });
}

function reasonMessage(reason: 'empty_receipt' | 'unknown_product'): string {
  switch (reason) {
    case 'empty_receipt':
      return 'receipt payload is empty';
    case 'unknown_product':
      return 'product id is not in the server catalog';
  }
}

function sendError(
  reply: FastifyReply,
  status: number,
  error: string,
  message: string,
): FastifyReply {
  return reply.code(status).send(ErrorResponse.parse({ error, message }));
}
