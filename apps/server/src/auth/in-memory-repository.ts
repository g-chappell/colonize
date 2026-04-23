// In-memory AuthRepository — used by Vitest suites and by the local dev
// boot when DATABASE_URL is unset. Holds three Maps; mirrors the behaviour
// of the Drizzle implementation closely enough that route tests written
// against this backend stay representative of production behaviour.
//
// Email lookup is case-insensitive (lower-cased on write + read); this
// matches the Postgres `unique index on lower(email)` invariant the
// migration enforces — see 0001_init.sql.

import type { AuthRepository, MagicLinkRecord, SessionRecord, UserRecord } from './repository.js';

export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly usersByEmail = new Map<string, UserRecord>();
  private readonly magicLinks = new Map<string, MagicLinkRecord>();
  private readonly sessions = new Map<string, SessionRecord>();

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async createUser(input: { id: string; email: string; createdAt: Date }): Promise<UserRecord> {
    const normalized = input.email.toLowerCase();
    if (this.usersByEmail.has(normalized)) {
      throw new Error(`user_already_exists: ${normalized}`);
    }
    const user: UserRecord = {
      id: input.id,
      email: normalized,
      createdAt: input.createdAt,
    };
    this.usersById.set(user.id, user);
    this.usersByEmail.set(normalized, user);
    return user;
  }

  async createMagicLink(input: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<MagicLinkRecord> {
    if (this.magicLinks.has(input.token)) {
      throw new Error(`magic_link_token_collision: ${input.token}`);
    }
    const record: MagicLinkRecord = {
      token: input.token,
      userId: input.userId,
      expiresAt: input.expiresAt,
      consumedAt: null,
    };
    this.magicLinks.set(input.token, record);
    return record;
  }

  async consumeMagicLink(token: string, now: Date): Promise<{ userId: string } | null> {
    const record = this.magicLinks.get(token);
    if (!record) return null;
    if (record.consumedAt !== null) return null;
    if (record.expiresAt.getTime() <= now.getTime()) return null;
    this.magicLinks.set(token, { ...record, consumedAt: now });
    return { userId: record.userId };
  }

  async createSession(input: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    if (this.sessions.has(input.token)) {
      throw new Error(`session_token_collision: ${input.token}`);
    }
    const record: SessionRecord = {
      token: input.token,
      userId: input.userId,
      expiresAt: input.expiresAt,
    };
    this.sessions.set(input.token, record);
    return record;
  }

  async findActiveSession(token: string, now: Date): Promise<SessionRecord | null> {
    const record = this.sessions.get(token);
    if (!record) return null;
    if (record.expiresAt.getTime() <= now.getTime()) return null;
    return record;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
