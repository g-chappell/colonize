-- 0003_entitlements.sql — user entitlements granted via IAP receipt
-- validation. Mirrors apps/server/src/db/schema.ts `entitlements`. One
-- row per (user_id, entitlement). The server is the only authority —
-- the server-side receipt validator (apps/server/src/iap/validator.ts)
-- decides which product id grants which entitlement; this table is the
-- durable record of "what has this user unlocked".

CREATE TABLE IF NOT EXISTS entitlements (
  user_id       varchar(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement   varchar(64)  NOT NULL,
  product_id    varchar(128) NOT NULL,
  platform      varchar(16)  NOT NULL,
  validated_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entitlement)
);
