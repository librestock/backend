import { betterAuth } from 'better-auth';
import { admin, organization } from 'better-auth/plugins';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import {
  getSSLConfig,
  getPoolMax,
  IDLE_TIMEOUT_MS,
  getDbConnectionParams,
} from './config/db-connection.utils';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from './effect/platform/tenant-constants';

const ADMIN_ROLE_NAME = 'Admin';
const FIRST_ADMIN_LOCK_KEY = 1_640_000_001;

function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

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

const trustedOrigins = parseOrigins(process.env.FRONTEND_URL);

const coreAuthSchema = {
  user: {
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    fields: {
      userId: 'user_id',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
    },
  },
  account: {
    fields: {
      userId: 'user_id',
      accountId: 'account_id',
      providerId: 'provider_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  verification: {
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
} as const;

const adminSchema = {
  user: {
    fields: {
      banReason: 'ban_reason',
      banExpires: 'ban_expires',
    },
  },
  session: {
    fields: {
      impersonatedBy: 'impersonated_by',
    },
  },
} as const;

const organizationSchema = {
  organization: {
    fields: {
      createdAt: 'created_at',
    },
  },
  member: {
    fields: {
      organizationId: 'organization_id',
      userId: 'user_id',
      createdAt: 'created_at',
    },
  },
  invitation: {
    fields: {
      organizationId: 'organization_id',
      inviterId: 'inviter_id',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
    },
  },
  session: {
    fields: {
      activeOrganizationId: 'active_organization_id',
    },
  },
} as const;

async function ensureDefaultTenantMembership(
  client: PoolClient,
  userId: string,
): Promise<void> {
  // V1 has no invitation or tenant-picker flow; signup joins the default org.
  await client.query(
    `INSERT INTO "organization" (id, name, slug, logo, metadata, created_at)
     VALUES ($1::uuid, $2, $3, NULL, NULL, NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`,
    [DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG],
  );

  await client.query(
    `INSERT INTO "member" (id, organization_id, user_id, role, created_at)
     VALUES ($1, $2::uuid, $3::uuid, 'member', NOW())
     ON CONFLICT (user_id, organization_id) DO NOTHING`,
    [randomUUID(), DEFAULT_TENANT_ID, userId],
  );
}

async function assignFirstAdminRole(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [
      FIRST_ADMIN_LOCK_KEY,
    ]);

    await ensureDefaultTenantMembership(client, userId);

    const roleResult = await client.query<{ id: string }>(
      `SELECT id FROM roles
       WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [DEFAULT_TENANT_ID, ADMIN_ROLE_NAME],
    );
    const adminRoleId = roleResult.rows[0]?.id;

    if (!adminRoleId) {
      await client.query('COMMIT');
      return;
    }

    const adminAssignmentExists = await client.query(
      `SELECT 1 FROM user_roles WHERE tenant_id = $1 AND role_id = $2 LIMIT 1`,
      [DEFAULT_TENANT_ID, adminRoleId],
    );

    if (adminAssignmentExists.rows.length === 0) {
      await client.query(
        `INSERT INTO user_roles (id, tenant_id, user_id, role_id)
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT (tenant_id, user_id, role_id) DO NOTHING`,
        [DEFAULT_TENANT_ID, userId, adminRoleId],
      );
      // Also set Better Auth's own role column so admin APIs (listUsers, etc.) work
      await client.query(`UPDATE "user" SET role = 'admin' WHERE id = $1`, [
        userId,
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Better Auth defaults to camelCase column names. The rest of the codebase uses
// snake_case (Drizzle schema, hand-written SQL in this file and in repositories,
// and the committed migrations). Map every camelCase field Better Auth knows
// about to its snake_case column so a single naming convention holds end-to-end.
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  ...coreAuthSchema,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 500,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 5 },
    },
  },
  plugins: [
    admin({
      schema: adminSchema,
    }),
    organization({
      allowUserToCreateOrganization: false,
      schema: organizationSchema,
    }),
  ],
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
