import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';
import {
  getSSLConfig,
  getPoolMax,
  IDLE_TIMEOUT_MS,
  getDbConnectionParams,
} from './config/db-connection.utils';

const ADMIN_ROLE_NAME = 'Admin';
const FIRST_ADMIN_LOCK_KEY = 1_640_000_001;

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required');
}

const ssl = getSSLConfig();
const poolMax = getPoolMax();
const params = getDbConnectionParams();

const pool =
  'url' in params
    ? new Pool({
        connectionString: params.url,
        ssl,
        max: poolMax,
        idleTimeoutMillis: IDLE_TIMEOUT_MS,
      })
    : new Pool({
        host: params.host,
        ...(params.port !== undefined ? { port: params.port } : {}),
        user: params.user,
        password: params.password,
        database: params.database,
        ssl,
        max: poolMax,
        idleTimeoutMillis: IDLE_TIMEOUT_MS,
      });

const trustedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : [];

async function assignFirstAdminRole(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [
      FIRST_ADMIN_LOCK_KEY,
    ]);

    const roleResult = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [ADMIN_ROLE_NAME],
    );
    const adminRoleId = roleResult.rows[0]?.id;

    if (!adminRoleId) {
      await client.query('COMMIT');
      return;
    }

    const adminAssignmentExists = await client.query(
      `SELECT 1 FROM user_roles WHERE role_id = $1 LIMIT 1`,
      [adminRoleId],
    );

    if (adminAssignmentExists.rows.length === 0) {
      await client.query(
        `INSERT INTO user_roles (id, user_id, role_id)
         VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, adminRoleId],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  plugins: [admin()],
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await assignFirstAdminRole(user.id);
        },
      },
    },
  },
});
