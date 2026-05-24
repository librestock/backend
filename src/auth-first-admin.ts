import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from './effect/platform/tenant-constants';

export const ADMIN_ROLE_NAME = 'Admin';
export const FIRST_ADMIN_LOCK_KEY = 1_640_000_001;

export async function ensureDefaultTenantMembership(
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
     VALUES ($1, $2::uuid, $3, 'member', NOW())
     ON CONFLICT (user_id, organization_id) DO NOTHING`,
    [randomUUID(), DEFAULT_TENANT_ID, userId],
  );
}

export function createFirstAdminAssigner(pool: Pick<Pool, 'connect'>) {
  return async function assignFirstAdminRole(userId: string): Promise<void> {
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
  };
}
