import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';
import {
  getDbConnectionParams,
  getPoolMax,
  getSSLConfig,
  IDLE_TIMEOUT_MS,
} from '../config/db-connection.utils';

config();

interface BetterAuthUserRow {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function readBooleanEnv(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

async function readStdin(): Promise<string> {
  let value = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    value += chunk;
  }
  return value.replace(/\r?\n$/, '');
}

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

async function runHashPassword(): Promise<void> {
  const password = await readStdin();
  if (!password) {
    throw new Error('Password must be supplied on stdin');
  }
  process.stdout.write(`${await hashPassword(password)}\n`);
}

async function seedSuperAdmin(): Promise<void> {
  const email = normalizeEmail(readRequiredEnv('SUPERADMIN_EMAIL'));
  const name = readRequiredEnv('SUPERADMIN_NAME');
  const passwordHash = readRequiredEnv('SUPERADMIN_PASSWORD_HASH');
  const rotatePassword = readBooleanEnv('SUPERADMIN_ROTATE_PASSWORD');
  const allowTenantMember = readBooleanEnv('SUPERADMIN_ALLOW_TENANT_MEMBER');

  const pool = new pg.Pool(buildPoolConfig());
  let client: pg.PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const existingUserResult = await client.query<BetterAuthUserRow>(
      'SELECT id, email, name FROM "user" WHERE lower(email) = $1 LIMIT 1',
      [email],
    );

    const existingUser = existingUserResult.rows[0] ?? null;
    let userId = existingUser?.id ?? null;

    if (userId) {
      const tenantMemberResult = await client.query(
        'SELECT 1 FROM member WHERE user_id = $1 LIMIT 1',
        [userId],
      );

      if (tenantMemberResult.rowCount && !allowTenantMember) {
        throw new Error(
          [
            'SUPERADMIN_EMAIL already belongs to a tenant member.',
            'Use a platform-only account or set SUPERADMIN_ALLOW_TENANT_MEMBER=true deliberately.',
          ].join(' '),
        );
      }
    } else {
      userId = randomUUID();
      await client.query(
        `
          INSERT INTO "user" (
            id,
            name,
            email,
            email_verified,
            role,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, true, 'user', NOW(), NOW())
        `,
        [userId, name, email],
      );
    }

    const credentialAccountResult = await client.query(
      `
        SELECT id
        FROM account
        WHERE user_id = $1 AND provider_id = 'credential'
        LIMIT 1
      `,
      [userId],
    );

    const credentialAccountId = credentialAccountResult.rows[0]?.id as
      | string
      | undefined;

    if (!credentialAccountId) {
      await client.query(
        `
          INSERT INTO account (
            id,
            account_id,
            provider_id,
            user_id,
            password,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'credential', $2, $3, NOW(), NOW())
        `,
        [randomUUID(), userId, passwordHash],
      );
    } else if (rotatePassword) {
      await client.query(
        `
          UPDATE account
          SET password = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [passwordHash, credentialAccountId],
      );
    }

    await client.query(
      `
        INSERT INTO super_admins (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId],
    );

    await client.query('COMMIT');
    console.log(
      `Seeded platform superadmin ${email} (${existingUser ? 'existing user' : 'new user'}).`,
    );
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--hash-password')) {
    await runHashPassword();
    return;
  }

  await seedSuperAdmin();
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
