// Repository abstraction over the auth-related Postgres tables. Two
// implementations live in this directory: InMemoryAuthRepository (used by
// tests and dev-without-DATABASE_URL boots) and DrizzleAuthRepository
// (used in production against Postgres). Routes only see this interface,
// so swapping the backing store is one wiring change in app.ts / index.ts
// — nothing in routes.ts changes.
//
// The interface deliberately exposes the *combined* user/session/magic-
// link surface as a single repository rather than three. The routes only
// ever need to coordinate across the three (createMagicLink follows
// findOrCreateUser; verify pairs consumeMagicLink with createSession), so
// every consumer would carry all three handles anyway. Folding them keeps
// the wiring boundary one type wide.

export interface UserRecord {
  id: string;
  email: string;
  createdAt: Date;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface MagicLinkRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: { id: string; email: string; createdAt: Date }): Promise<UserRecord>;

  createMagicLink(input: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<MagicLinkRecord>;
  /**
   * Atomically validate-and-consume a magic-link token. Returns the userId
   * iff the token exists, has not expired at `now`, and has not already been
   * consumed; null otherwise. Implementations MUST mark the token consumed
   * before returning so a duplicate verify request fails.
   */
  consumeMagicLink(token: string, now: Date): Promise<{ userId: string } | null>;

  createSession(input: { token: string; userId: string; expiresAt: Date }): Promise<SessionRecord>;
  /** Returns the live session iff token exists and `expiresAt > now`. */
  findActiveSession(token: string, now: Date): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;
}
