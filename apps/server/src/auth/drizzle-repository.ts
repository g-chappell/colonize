// Drizzle/Postgres-backed AuthRepository. Wired in production when
// DATABASE_URL is set (see apps/server/src/index.ts). Tests stay on the
// in-memory repo — this implementation is exercised end-to-end in CI only
// once the docker compose Postgres service is part of the test matrix
// (deferred follow-up).

import { eq, and, isNull, gt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { magicLinks, sessions, users } from '../db/schema.js';
import type { AuthRepository, MagicLinkRecord, SessionRecord, UserRecord } from './repository.js';

type Db = PostgresJsDatabase<{
  users: typeof users;
  sessions: typeof sessions;
  magicLinks: typeof magicLinks;
}>;

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Db) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async createUser(input: { id: string; email: string; createdAt: Date }): Promise<UserRecord> {
    const [row] = await this.db
      .insert(users)
      .values({
        id: input.id,
        email: input.email.toLowerCase(),
        createdAt: input.createdAt,
      })
      .returning();
    if (!row) throw new Error('createUser: insert returned no rows');
    return toUser(row);
  }

  async createMagicLink(input: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<MagicLinkRecord> {
    const [row] = await this.db
      .insert(magicLinks)
      .values({
        token: input.token,
        userId: input.userId,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!row) throw new Error('createMagicLink: insert returned no rows');
    return toMagicLink(row);
  }

  async consumeMagicLink(token: string, now: Date): Promise<{ userId: string } | null> {
    // Atomic update: only mark consumed if currently unconsumed AND unexpired.
    // Returning the userId keeps the read+write in one round-trip and guarantees
    // a duplicate verify request gets null instead of stale state.
    const [row] = await this.db
      .update(magicLinks)
      .set({ consumedAt: now })
      .where(
        and(
          eq(magicLinks.token, token),
          isNull(magicLinks.consumedAt),
          gt(magicLinks.expiresAt, now),
        ),
      )
      .returning({ userId: magicLinks.userId });
    return row ? { userId: row.userId } : null;
  }

  async createSession(input: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const [row] = await this.db
      .insert(sessions)
      .values({
        token: input.token,
        userId: input.userId,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!row) throw new Error('createSession: insert returned no rows');
    return toSession(row);
  }

  async findActiveSession(token: string, now: Date): Promise<SessionRecord | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
      .limit(1);
    const row = rows[0];
    return row ? toSession(row) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }
}

function toUser(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt,
  };
}

function toSession(row: typeof sessions.$inferSelect): SessionRecord {
  return {
    token: row.token,
    userId: row.userId,
    expiresAt: row.expiresAt,
  };
}

function toMagicLink(row: typeof magicLinks.$inferSelect): MagicLinkRecord {
  return {
    token: row.token,
    userId: row.userId,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
  };
}
