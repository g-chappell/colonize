import { describe, it, expect } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMigrationsFromDir, MIGRATION_TABLE_DDL } from './migrate.js';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(here, '../../migrations');

describe('loadMigrationsFromDir', () => {
  it('loads the initial migration in lexical order', () => {
    const migs = loadMigrationsFromDir(MIGRATIONS_DIR);
    expect(migs.length).toBeGreaterThanOrEqual(1);
    expect(migs[0]?.id).toBe('0001_init');
    expect(migs[0]?.sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(migs[0]?.sql).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(migs[0]?.sql).toContain('CREATE TABLE IF NOT EXISTS magic_links');

    const ids = migs.map((m) => m.id);
    expect([...ids].sort()).toEqual(ids);
  });
});

describe('MIGRATION_TABLE_DDL', () => {
  it('declares the schema_migrations bookkeeping table', () => {
    expect(MIGRATION_TABLE_DDL).toContain('schema_migrations');
    expect(MIGRATION_TABLE_DDL).toContain('PRIMARY KEY');
  });
});
