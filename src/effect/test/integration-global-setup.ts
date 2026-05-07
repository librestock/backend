import { execFileSync } from 'node:child_process';
import path from 'node:path';
import pg from 'pg';
import { getCommittedSqlMigrations } from '../platform/db/committed-sql-migrations';

const TEST_DB_NAME = 'librestock_inventory_test';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const DRIZZLE_KIT_BIN = path.join(
  PROJECT_ROOT,
  'node_modules',
  '.bin',
  'drizzle-kit',
);
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'drizzle');

function getAdminUrl(): string {
  const base =
    process.env.TEST_DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432';
  const url = new URL(base);
  url.pathname = '/postgres';
  return url.toString();
}

function getTestUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const admin = getAdminUrl();
  const url = new URL(admin);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

export async function setup(): Promise<void> {
  const adminUrl = getAdminUrl();
  const testUrl = getTestUrl();

  // 1. Create the test database if it doesn't exist
  const adminPool = new pg.Pool({ connectionString: adminUrl });
  try {
    const { rows } = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DB_NAME],
    );
    if (rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
      console.info(`Created test database: ${TEST_DB_NAME}`);
    }
  } finally {
    await adminPool.end();
  }

  // 2. Push schema via drizzle-kit (idempotent, --force skips confirmations)
  execFileSync(
    DRIZZLE_KIT_BIN,
    [
      'push',
      '--force',
      '--dialect',
      'postgresql',
      '--schema',
      './src/effect/platform/db/schema.ts',
      '--url',
      testUrl,
    ],
    { cwd: PROJECT_ROOT, stdio: 'pipe' },
  );

  // 3. Apply committed SQL migrations for developer test DBs that predate them.
  const testPool = new pg.Pool({ connectionString: testUrl });
  try {
    for (const migration of getCommittedSqlMigrations(MIGRATIONS_DIR)) {
      await testPool.query(migration.sql);
    }

    // 4. Create custom sequences not managed by Drizzle
    await testPool.query(
      `CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1`,
    );
  } finally {
    await testPool.end();
  }
}
