/**
 * Fixtures for the `UsersService` integration test.
 *
 * `UsersService.updateRoles` calls `usersRepository.syncBetterAuthRole`, which
 * runs `UPDATE "user" SET role = ... WHERE id = $1` against the Better Auth
 * `user` table. That table is NOT part of the Drizzle schema pushed by
 * `integration-global-setup.ts`, so we provision a minimal compatible version
 * here so the test can exercise the full flow end-to-end.
 *
 * Similarly, the `roles` table is truncated between tests but not seeded, so
 * `seedRole` inserts a row we can reference from `updateRoles` calls.
 */
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { DrizzleDb } from '../../../platform/drizzle';
import { members, organizations, roles } from '../../../platform/db/schema';
import {
  ensureBetterAuthUserTable as ensureSharedBetterAuthUserTable,
  seedBetterAuthUser,
} from '../../../test/seed';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from '../../../platform/tenant-constants';

/**
 * Create a stand-in for Better Auth's `user` table if the schema push did not
 * provision one. Only the columns `UsersRepository.syncBetterAuthRole` touches
 * need to exist (`id`, `role`). Extra columns are added to keep the shape
 * plausible and tolerate future growth.
 *
 * Idempotent: safe to call on every test-suite bootstrap.
 */
export async function ensureBetterAuthUserTable(db: DrizzleDb): Promise<void> {
  await ensureSharedBetterAuthUserTable(db);
}

/**
 * Insert a Better Auth `user` row so the integration test's
 * `UPDATE "user" SET role = ...` touches a real row (the production query has
 * no `RETURNING`, but inserting one matches the real runtime state).
 */
export async function seedBetterAuthUserRow(
  db: DrizzleDb,
  overrides: {
    id: string;
    name?: string;
    email?: string;
    role?: 'admin' | 'user';
  },
): Promise<void> {
  await seedBetterAuthUser(db, overrides);
}

export async function seedDefaultTenantMembership(
  db: DrizzleDb,
  userId: string,
): Promise<void> {
  await seedTenantMembership(db, userId, {
    tenantId: DEFAULT_TENANT_ID,
    name: DEFAULT_TENANT_NAME,
    slug: DEFAULT_TENANT_SLUG,
  });
}

export async function seedTenantMembership(
  db: DrizzleDb,
  userId: string,
  tenant: {
    tenantId: string;
    name?: string;
    slug?: string;
  },
): Promise<void> {
  await ensureBetterAuthUserTable(db);
  await db.execute(sql`
    INSERT INTO "user" (id, name, email, role, created_at, updated_at)
    VALUES (${userId}, 'Test User', ${`${userId}@example.com`}, 'user', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await db
    .insert(organizations)
    .values({
      id: tenant.tenantId,
      name: tenant.name ?? `Tenant ${tenant.tenantId}`,
      slug: tenant.slug ?? `tenant-${tenant.tenantId}`,
    })
    .onConflictDoNothing();
  await db
    .insert(members)
    .values({
      id: randomUUID(),
      organization_id: tenant.tenantId,
      user_id: userId,
      role: 'member',
    })
    .onConflictDoNothing();
}

export async function seedTenantUserRow(
  db: DrizzleDb,
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: 'admin' | 'user';
  },
): Promise<void> {
  await seedBetterAuthUserRow(db, {
    id: user.id,
    name: user.name ?? 'Test User',
    email: user.email ?? `${user.id}@example.com`,
    role: user.role,
  });
  await seedDefaultTenantMembership(db, user.id);
}

export async function readBetterAuthUserRole(
  db: DrizzleDb,
  userId: string,
): Promise<string | null> {
  const result = await db.execute(
    sql`SELECT role FROM "user" WHERE id = ${userId} LIMIT 1`,
  );
  const rows = (result as unknown as { rows: { role: string | null }[] }).rows;
  return rows[0]?.role ?? null;
}

/**
 * Seed a role row directly in `roles`. We do not use the seeded system roles
 * because this test should not depend on `RolesService.seed()` side effects.
 */
export async function seedRole(
  db: DrizzleDb,
  overrides: Partial<typeof roles.$inferInsert> = {},
) {
  const [row] = await db
    .insert(roles)
    .values({
      id: overrides.id ?? randomUUID(),
      name: overrides.name ?? `Role-${randomUUID().slice(0, 8)}`,
      tenant_id: overrides.tenant_id ?? DEFAULT_TENANT_ID,
      description: overrides.description ?? null,
      is_system: overrides.is_system ?? false,
    })
    .returning();
  return row!;
}
