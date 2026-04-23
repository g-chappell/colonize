-- 0002_saves.sql — cloud-save table. Mirrors apps/server/src/db/schema.ts
-- `saves`. One row per (user_id, slot); version is a monotonically
-- increasing integer owned by the client. last-writer-wins semantics
-- are enforced in the repository (incoming version must exceed stored
-- version) rather than at the SQL level.

CREATE TABLE IF NOT EXISTS saves (
  user_id     varchar(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot        varchar(32)  NOT NULL,
  version     integer      NOT NULL,
  payload     jsonb        NOT NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);
