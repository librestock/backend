import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import {
  auditLogs,
  inventory,
  members,
  organizations,
  rolePermissions,
  roles,
  userRoles,
} from '../platform/db/schema';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from '../platform/tenant-constants';
import type { DrizzleDb } from '../platform/drizzle';
import { makeTestHttpAppHandler } from '../testing/app-harness';
import {
  getTestDb,
  seedBetterAuthUser,
  seedCategory,
  seedLocation,
  seedProduct,
  TEST_USER_ID,
  TEST_USER_ID_2,
  withTestDb,
} from '../testing/test-harness';

let db: DrizzleDb;

withTestDb();
beforeAll(() => {
  db = getTestDb();
});

const makeSession = (userId = TEST_USER_ID) => ({
  user: {
    id: userId,
    name: 'Acceptance Test User',
    email: `${userId}@example.com`,
    image: null,
    emailVerified: true,
    createdAt: new Date('2026-05-24T08:00:00.000Z'),
    updatedAt: new Date('2026-05-24T08:00:00.000Z'),
    role: 'user' as const,
  },
  session: {
    id: `session-${userId}`,
    userId,
    token: `token-${userId}`,
    createdAt: new Date('2026-05-24T08:00:00.000Z'),
    updatedAt: new Date('2026-05-24T08:00:00.000Z'),
    expiresAt: new Date('2026-06-24T08:00:00.000Z'),
    activeOrganizationId: null,
  },
});

async function seedDefaultTenantMembership(userId: string) {
  await seedBetterAuthUser(db, { id: userId });
  await db
    .insert(organizations)
    .values({
      id: DEFAULT_TENANT_ID,
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
    })
    .onConflictDoNothing();
  await db
    .insert(members)
    .values({
      id: randomUUID(),
      organization_id: DEFAULT_TENANT_ID,
      user_id: userId,
      role: 'member',
    })
    .onConflictDoNothing();
}

async function seedRoleForUser(
  userId: string,
  permissions: readonly { resource: Resource; permission: Permission }[],
) {
  await seedDefaultTenantMembership(userId);

  const [role] = await db
    .insert(roles)
    .values({
      tenant_id: DEFAULT_TENANT_ID,
      name: `Acceptance-${userId.slice(-4)}-${randomUUID()}`,
      is_system: false,
    })
    .returning();

  if (!role) throw new Error('Failed to seed role');

  if (permissions.length > 0) {
    await db.insert(rolePermissions).values(
      permissions.map((permission) => ({
        role_id: role.id,
        resource: permission.resource,
        permission: permission.permission,
      })),
    );
  }

  await db.insert(userRoles).values({
    tenant_id: DEFAULT_TENANT_ID,
    user_id: userId,
    role_id: role.id,
  });
}

async function seedInventoryPrereqs() {
  const category = await seedCategory(db);
  const product = await seedProduct(db, { category_id: category.id });
  const location = await seedLocation(db);
  return { category, product, location };
}

async function findAuditLog(entityId: string) {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.entity_id, entityId),
        eq(auditLogs.entity_type, AuditEntityType.INVENTORY),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function waitForAuditLog(entityId: string) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const row = await findAuditLog(entityId);
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for audit log for ${entityId}`);
}

describe('buildHttpApp acceptance', () => {
  it('serves the public health check through the composed app', async () => {
    const { handler, dispose } = makeTestHttpAppHandler();
    try {
      const response = await handler(
        new Request('http://localhost/health-check/live'),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
    } finally {
      await dispose();
    }
  });

  it('creates inventory and writes audit through the composed authenticated app', async () => {
    await seedRoleForUser(TEST_USER_ID, [
      { resource: Resource.INVENTORY, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.WRITE },
    ]);
    const { product, location } = await seedInventoryPrereqs();

    const { handler, dispose } = makeTestHttpAppHandler({
      session: makeSession(TEST_USER_ID),
    });
    try {
      const response = await handler(
        new Request('http://localhost/api/v1/inventory', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-request-id': '00000000-0000-4000-8000-000000000111',
          },
          body: JSON.stringify({
            product_id: product.id,
            location_id: location.id,
            quantity: 12,
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string; quantity: number };
      expect(body.quantity).toBe(12);

      const rows = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, body.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        tenant_id: DEFAULT_TENANT_ID,
        product_id: product.id,
        location_id: location.id,
        quantity: 12,
      });

      const auditLog = await waitForAuditLog(body.id);
      expect(auditLog).toMatchObject({
        tenant_id: DEFAULT_TENANT_ID,
        user_id: TEST_USER_ID,
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.INVENTORY,
        entity_id: body.id,
      });
    } finally {
      await dispose();
    }
  });

  it('rejects inventory writes without permission and leaves state unchanged', async () => {
    await seedRoleForUser(TEST_USER_ID_2, [
      { resource: Resource.INVENTORY, permission: Permission.READ },
    ]);
    const { product, location } = await seedInventoryPrereqs();

    const { handler, dispose } = makeTestHttpAppHandler({
      session: makeSession(TEST_USER_ID_2),
    });
    try {
      const response = await handler(
        new Request('http://localhost/api/v1/inventory', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            location_id: location.id,
            quantity: 12,
          }),
        }),
      );

      expect(response.status).toBe(403);
      const inventoryRows = await db.select().from(inventory);
      const auditRows = await db.select().from(auditLogs);
      expect(inventoryRows).toHaveLength(0);
      expect(auditRows).toHaveLength(0);
    } finally {
      await dispose();
    }
  });

  it('rejects invalid inventory bodies before service writes', async () => {
    await seedRoleForUser(TEST_USER_ID, [
      { resource: Resource.INVENTORY, permission: Permission.WRITE },
    ]);
    const { product } = await seedInventoryPrereqs();

    const { handler, dispose } = makeTestHttpAppHandler({
      session: makeSession(TEST_USER_ID),
    });
    try {
      const response = await handler(
        new Request('http://localhost/api/v1/inventory', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            quantity: -1,
          }),
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        statusCode: 400,
        messageKey: 'http.parseError',
      });
      const inventoryRows = await db.select().from(inventory);
      const auditRows = await db.select().from(auditLogs);
      expect(inventoryRows).toHaveLength(0);
      expect(auditRows).toHaveLength(0);
    } finally {
      await dispose();
    }
  });
});
