import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { buildApp, type BuildAppOptions } from './app.js';
import { InMemoryAuthRepository } from './auth/in-memory-repository.js';
import { DrizzleAuthRepository } from './auth/drizzle-repository.js';
import { ConsoleMagicLinkSender } from './auth/sender.js';
import type { AuthRepository } from './auth/repository.js';
import { InMemorySaveRepository } from './saves/in-memory-repository.js';
import { DrizzleSaveRepository } from './saves/drizzle-repository.js';
import type { SaveRepository } from './saves/repository.js';
import { magicLinks, saves, sessions, users } from './db/schema.js';
import { loadMigrationsFromDir, runMigrations } from './db/migrate.js';

const port = Number(process.env.APP_PORT ?? 3000);
const host = process.env.APP_HOST ?? '0.0.0.0';

async function start() {
  const databaseUrl = process.env.DATABASE_URL;
  let repository: AuthRepository;
  let saveRepository: SaveRepository;

  if (databaseUrl) {
    const sql = postgres(databaseUrl, { max: 10 });
    const here = dirname(fileURLToPath(import.meta.url));
    // Compiled layout: apps/server/dist/index.js → apps/server/migrations
    const migrationsDir = resolve(here, '..', 'migrations');
    const migrations = loadMigrationsFromDir(migrationsDir);
    const applied = await runMigrations(sql, migrations);
    if (applied.length > 0) {
      console.info(`[server] applied migrations: ${applied.join(', ')}`);
    }
    const db = drizzle(sql, { schema: { users, sessions, magicLinks, saves } });
    repository = new DrizzleAuthRepository(db);
    saveRepository = new DrizzleSaveRepository(db);
  } else {
    repository = new InMemoryAuthRepository();
    saveRepository = new InMemorySaveRepository();
  }

  const magicLinkBaseUrl = process.env.MAGIC_LINK_BASE_URL ?? 'http://localhost:3000/auth/verify';

  const auth: BuildAppOptions['auth'] = {
    repository,
    sender: new ConsoleMagicLinkSender({
      info: (msg, meta) => {
        console.info(msg, meta ?? {});
      },
    }),
    magicLinkBaseUrl,
  };

  const app = buildApp({ auth, saves: { saves: saveRepository } });

  await app.listen({ port, host });
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
