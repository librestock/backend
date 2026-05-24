import { betterAuth } from 'better-auth';
import { admin, organization } from 'better-auth/plugins';
import { Pool } from 'pg';
import { createFirstAdminAssigner } from './auth-first-admin';
import { getCrossSubDomainCookieConfig } from './auth-cookie-domain';
import {
  getSSLConfig,
  getPoolMax,
  IDLE_TIMEOUT_MS,
  getDbConnectionParams,
} from './config/db-connection.utils';
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
const crossSubDomainCookies = getCrossSubDomainCookieConfig({
  authBaseUrl: process.env.BETTER_AUTH_URL,
  frontendOrigins: trustedOrigins,
  cookieDomain: process.env.BETTER_AUTH_COOKIE_DOMAIN,
});

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

const assignFirstAdminRole = createFirstAdminAssigner(pool);

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
    ...(crossSubDomainCookies ? { crossSubDomainCookies } : {}),
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
