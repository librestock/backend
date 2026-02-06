/**
 * Shared database connection utilities for TypeORM and Better Auth pg Pool.
 */

export function getSSLConfig(): { rejectUnauthorized: boolean } | false {
  const rejectUnauthorized =
    (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() === 'true';
  return process.env.DB_SSL === 'true'
    ? { rejectUnauthorized }
    : false;
}

export function getPoolMax(): number {
  const poolMax = Number.parseInt(process.env.DB_POOL_MAX ?? '20', 10);
  if (Number.isNaN(poolMax) || poolMax <= 0) {
    throw new Error('DB_POOL_MAX must be a positive integer');
  }
  return poolMax;
}

export const IDLE_TIMEOUT_MS = 30000;

export interface DbConnectionParams {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Returns the shared database connection parameters from environment variables.
 * Used by both TypeORM (database.config.ts) and Better Auth (auth.ts).
 */
export function getDbConnectionParams(): { url: string } | DbConnectionParams {
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL };
  }

  const host = process.env.PGHOST ?? 'localhost';
  const isSocket = host.startsWith('/');

  return {
    host,
    ...(isSocket ? {} : { port: Number.parseInt(process.env.PGPORT ?? '5432', 10) }),
    user: process.env.PGUSER ?? process.env.USER ?? '',
    password: process.env.PGPASSWORD ?? '',
    database: process.env.PGDATABASE ?? 'librestock_inventory',
  };
}
