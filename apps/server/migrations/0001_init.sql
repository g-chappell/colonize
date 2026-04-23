-- 0001_init.sql — initial Postgres schema for accounts, sessions, magic links.
-- Mirrors apps/server/src/db/schema.ts. Keep both in lockstep.

CREATE TABLE IF NOT EXISTS users (
  id          varchar(36)  PRIMARY KEY,
  email       varchar(255) NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  token       varchar(64)  PRIMARY KEY,
  user_id     varchar(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz  NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS magic_links (
  token        varchar(64)  PRIMARY KEY,
  user_id      varchar(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   timestamptz  NOT NULL,
  consumed_at  timestamptz,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magic_links_user_id_idx ON magic_links (user_id);
