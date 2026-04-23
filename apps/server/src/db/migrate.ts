// Minimal forward-only migration runner. Reads numbered .sql files from the
// migrations directory in lexical order, records each in `schema_migrations`,
// and skips any already applied. The whole sequence runs on server boot when
// DATABASE_URL is set so a fresh deploy initialises the schema before the
// auth routes accept traffic.
//
// Deliberately not Drizzle's built-in migrator: drizzle-kit ships a journal
// format that adds a build-step + a generated folder, both of which are
// follow-up cost we don't need yet. Hand-written .sql + a tiny applier
// keeps the wire format obvious and the deploy path zero-tooling.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Sql } from 'postgres';

export const MIGRATION_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id          text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )
`;

export interface MigrationFile {
  id: string;
  sql: string;
}

export function loadMigrationsFromDir(dir: string): MigrationFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      id: file.replace(/\.sql$/, ''),
      sql: readFileSync(resolve(dir, file), 'utf8'),
    }));
}

export async function runMigrations(sql: Sql, migrations: MigrationFile[]): Promise<string[]> {
  await sql.unsafe(MIGRATION_TABLE_DDL);

  const appliedRows = await sql<{ id: string }[]>`SELECT id FROM schema_migrations`;
  const applied = new Set(appliedRows.map((r) => r.id));

  const newlyApplied: string[] = [];
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(m.sql);
      await tx`INSERT INTO schema_migrations (id) VALUES (${m.id})`;
    });
    newlyApplied.push(m.id);
  }
  return newlyApplied;
}
