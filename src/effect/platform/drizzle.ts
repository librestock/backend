import { Data, Context, Effect, Layer } from 'effect';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import {
  getDbConnectionParams,
  getSSLConfig,
  getPoolMax,
  IDLE_TIMEOUT_MS,
} from '../../config/db-connection.utils';
import * as schema from './db/schema';
import * as relations from './db/relations';

export type DrizzleDb = NodePgDatabase<typeof schema & typeof relations>;

const __pool = Symbol('__pool');
type DrizzleDbWithPool = DrizzleDb & { [__pool]?: pg.Pool };

export class DrizzleInitializationError extends Data.TaggedError(
  'DrizzleInitializationError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const DrizzleDatabase = Context.GenericTag<DrizzleDb>(
  '@librestock/effect/DrizzleDatabase',
);

function buildPoolConfig(): pg.PoolConfig {
  const connParams = getDbConnectionParams();
  const ssl = getSSLConfig();
  const max = getPoolMax();

  if ('url' in connParams) {
    return {
      connectionString: connParams.url,
      ssl: ssl || undefined,
      max,
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
    };
  }

  return {
    host: connParams.host,
    port: connParams.port,
    user: connParams.user,
    password: connParams.password,
    database: connParams.database,
    ssl: ssl || undefined,
    max,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
  };
}

export const drizzleLayer = Layer.scoped(
  DrizzleDatabase,
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const pool = new pg.Pool(buildPoolConfig());
        // Verify connection
        const client = await pool.connect();
        client.release();

        const db = drizzle(pool, {
          schema: { ...schema, ...relations },
          logger: process.env.NODE_ENV === 'development',
        });

        // Attach pool for cleanup
        (db as DrizzleDbWithPool)[__pool] = pool;

        return db as DrizzleDb;
      },
      catch: (cause) =>
        new DrizzleInitializationError({
          cause,
          message: 'Failed to initialize Drizzle database connection',
        }),
    }),
    (db) =>
      Effect.promise(async () => {
        const pool = (db as DrizzleDbWithPool)[__pool];
        if (pool) {
          await pool.end();
        }
      }),
  ),
);
