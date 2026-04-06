import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { Layer } from 'effect';
import { DrizzleDatabase, type DrizzleDb } from '../platform/drizzle';
import * as schema from '../platform/db/schema';
import * as relations from '../platform/db/relations';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/librestock_inventory_test';

let pool: pg.Pool | null = null;
let db: DrizzleDb | null = null;

export function getTestDb(): DrizzleDb {
  if (!db) {
    pool = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 5 });
    db = drizzle(pool, {
      schema: { ...schema, ...relations },
    }) as unknown as DrizzleDb;
  }
  return db;
}

export async function closeTestDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export async function truncateAll(): Promise<void> {
  const testDb = getTestDb();
  await testDb.execute(sql`
    TRUNCATE TABLE
      audit_logs, stock_movements, order_items, orders,
      inventory, photos, supplier_products, products,
      areas, locations, categories, suppliers, clients,
      branding_settings, role_permissions, user_roles, roles
    CASCADE
  `);
  await testDb.execute(
    sql`ALTER SEQUENCE IF EXISTS order_number_seq RESTART WITH 1`,
  );
}

export function makeTestDrizzleLayer(): Layer.Layer<DrizzleDb> {
  return Layer.succeed(DrizzleDatabase, getTestDb()) as Layer.Layer<DrizzleDb>;
}
