// Auth routes plugin — registers POST /auth/magic-link, POST /auth/verify,
// and GET /me on the supplied Fastify instance. All three endpoints
// validate request and response bodies through the Zod schemas in
// packages/shared so the wire contract is shared with future client code.
//
// The plugin is repository-agnostic: it composes the AuthRepository +
// MagicLinkSender supplied via options, generates ids/tokens through the
// injected `random` callbacks (overridable in tests for determinism), and
// reads the current time through the `now` callback. None of these are
// optional in tests — the defaults call into node:crypto and Date.now,
// which is what production uses.

import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
// Side-effect import: @fastify/cookie augments FastifyRequest.cookies and
// FastifyReply.setCookie. Type-side augmentation only — the cookie plugin
// itself is registered in app.ts.
import '@fastify/cookie';
import {
  ErrorResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  MeResponse,
  User,
  VerifyRequest,
  VerifyResponse,
  type User as UserDto,
} from '@colonize/shared';
import type { AuthRepository, UserRecord } from './repository.js';
import type { MagicLinkSender } from './sender.js';

export interface AuthRoutesOptions {
  repository: AuthRepository;
  sender: MagicLinkSender;
  /** Cookie name carrying the opaque session token. */
  sessionCookieName: string;
  /** Whether to set the Secure attribute on the session cookie. */
  sessionCookieSecure: boolean;
  /** Session lifetime in milliseconds. */
  sessionTtlMs: number;
  /** Magic-link token lifetime in milliseconds. */
  magicLinkTtlMs: number;
  /** Base URL prefix the magic-link email points at; verify-token is appended. */
  magicLinkBaseUrl: string;
  /** Override clock for tests. */
  now?: () => Date;
  /** Override id generator for tests. */
  newUserId?: () => string;
  /** Override token generator for tests. */
  newToken?: () => string;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  opts: AuthRoutesOptions,
): Promise<void> {
  const now = opts.now ?? (() => new Date());
  const newUserId = opts.newUserId ?? (() => randomUUID());
  const newToken = opts.newToken ?? (() => randomBytes(32).toString('hex'));

  app.post('/auth/magic-link', async (req, reply) => {
    const parsed = MagicLinkRequest.safeParse(req.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_request', 'email is required and must be valid');
    }

    const email = parsed.data.email.toLowerCase();
    const issuedAt = now();
    const user =
      (await opts.repository.findUserByEmail(email)) ??
      (await opts.repository.createUser({ id: newUserId(), email, createdAt: issuedAt }));

    const token = newToken();
    await opts.repository.createMagicLink({
      token,
      userId: user.id,
      expiresAt: new Date(issuedAt.getTime() + opts.magicLinkTtlMs),
    });

    await opts.sender.send({
      email: user.email,
      token,
      link: `${stripTrailingSlash(opts.magicLinkBaseUrl)}?token=${encodeURIComponent(token)}`,
    });

    return reply.code(200).send(MagicLinkResponse.parse({ ok: true }));
  });

  app.post('/auth/verify', async (req, reply) => {
    const parsed = VerifyRequest.safeParse(req.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid_request', 'token is required');
    }

    const issuedAt = now();
    const consumed = await opts.repository.consumeMagicLink(parsed.data.token, issuedAt);
    if (!consumed) {
      return sendError(
        reply,
        400,
        'invalid_token',
        'magic-link token is unknown, expired, or already used',
      );
    }

    const user = await opts.repository.findUserById(consumed.userId);
    if (!user) {
      return sendError(reply, 500, 'user_missing', 'session user lookup failed');
    }

    const sessionToken = newToken();
    const sessionExpiresAt = new Date(issuedAt.getTime() + opts.sessionTtlMs);
    await opts.repository.createSession({
      token: sessionToken,
      userId: user.id,
      expiresAt: sessionExpiresAt,
    });

    reply.setCookie(opts.sessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: opts.sessionCookieSecure,
      expires: sessionExpiresAt,
    });

    return reply.code(200).send(VerifyResponse.parse({ user: toDto(user) }));
  });

  app.get('/me', async (req, reply) => {
    const token = req.cookies[opts.sessionCookieName];
    if (!token) {
      return sendError(reply, 401, 'unauthenticated', 'no session cookie present');
    }

    const session = await opts.repository.findActiveSession(token, now());
    if (!session) {
      return sendError(reply, 401, 'unauthenticated', 'session is unknown or expired');
    }

    const user = await opts.repository.findUserById(session.userId);
    if (!user) {
      return sendError(reply, 401, 'unauthenticated', 'session user no longer exists');
    }

    return reply.code(200).send(MeResponse.parse({ user: toDto(user) }));
  });
}

function toDto(user: UserRecord): UserDto {
  return User.parse({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
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

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
