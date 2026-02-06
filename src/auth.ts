import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';
import { getSSLConfig, getPoolMax, IDLE_TIMEOUT_MS, getDbConnectionParams } from './config/db-connection.utils';

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required');
}

const ssl = getSSLConfig();
const poolMax = getPoolMax();
const params = getDbConnectionParams();

const pool = 'url' in params
  ? new Pool({ connectionString: params.url, ssl, max: poolMax, idleTimeoutMillis: IDLE_TIMEOUT_MS })
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

const trustedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];

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
          const { rows } = await pool.query(
            `SELECT 1 FROM user_roles WHERE role = 'ADMIN' LIMIT 1`,
          );
          if (rows.length === 0) {
            await pool.query(
              `INSERT INTO user_roles (id, user_id, role) VALUES (gen_random_uuid(), $1, 'ADMIN')`,
              [user.id],
            );
          }
        },
      },
    },
  },
});
