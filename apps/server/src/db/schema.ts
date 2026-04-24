// Drizzle ORM schema for the Colonize Postgres-backed account system.
// The hand-written SQL in apps/server/migrations/ is the source of truth
// for the live database; these declarations exist so DrizzleAuthRepository
// can issue typed queries. Keep the two in sync — when adding a column,
// add a new numbered migration AND update the matching pgTable here.

import {
  pgTable,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_unique').on(t.email),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    token: varchar('token', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('sessions_user_id_idx').on(t.userId),
  }),
);

export const magicLinks = pgTable(
  'magic_links',
  {
    token: varchar('token', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('magic_links_user_id_idx').on(t.userId),
  }),
);

export const saves = pgTable(
  'saves',
  {
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slot: varchar('slot', { length: 32 }).notNull(),
    version: integer('version').notNull(),
    payload: jsonb('payload').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.slot] }),
  }),
);

// Entitlements granted via IAP receipt validation. One row per
// (user_id, entitlement); the product id + platform that granted the
// entitlement are tracked for audit but not re-read at gate-check time
// — the mere presence of the row is what `hasRemoveAds` evaluates.
export const entitlements = pgTable(
  'entitlements',
  {
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entitlement: varchar('entitlement', { length: 64 }).notNull(),
    productId: varchar('product_id', { length: 128 }).notNull(),
    platform: varchar('platform', { length: 16 }).notNull(),
    validatedAt: timestamp('validated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.entitlement] }),
  }),
);
