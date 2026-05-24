import { randomUUID } from 'node:crypto';
import { Effect } from 'effect';
import { and, asc, eq, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { DrizzleDatabase } from '../../platform/drizzle';
import {
  betterAuthUsers,
  members,
  organizations,
  platformAuditEvents,
  rolePermissions,
  roles,
  tenantDomains,
  userRoles,
} from '../../platform/db/schema';
import { makeTryAsync } from '../../platform/try-async';
import { defaultRoleSeedDefinitions } from '../roles/service';
import { SuperAdminRepositoryError } from './superadmin.errors';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new SuperAdminRepositoryError({
      action,
      cause,
      messageKey: 'superadmin.repositoryFailed',
    }),
);

export interface SuperAdminUserRow {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
}

export interface TenantListRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly primaryHostname: string | null;
  readonly createdAt: Date;
}

export interface CreateTenantInput {
  readonly name: string;
  readonly slug: string;
  readonly hostname: string;
  readonly admin: {
    readonly name: string;
    readonly email: string;
    readonly password: string;
  };
  readonly actorUserId: string;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}

export interface CreatedTenantResult {
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly hostname: string;
  };
  readonly admin: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
  };
}

const rowsOf = <A>(result: unknown): A[] =>
  ((result as { rows?: A[] }).rows ?? (result as A[])) as A[];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class SuperAdminRepository extends Effect.Service<SuperAdminRepository>()(
  '@librestock/effect/superadmin/SuperAdminRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findSuperAdminUser = (userId: string) =>
        tryAsync('find superadmin user', async () => {
          const result = await db.execute(sql`
            SELECT u.id, u.email, u.name
            FROM "user" u
            INNER JOIN super_admins sa ON sa.user_id = u.id::text
            WHERE u.id::text = ${userId}
            LIMIT 1
          `);

          return rowsOf<SuperAdminUserRow>(result)[0] ?? null;
        });

      const listTenants = () =>
        tryAsync('list platform tenants', async () => {
          const rows = await db
            .select({
              id: organizations.id,
              name: organizations.name,
              slug: organizations.slug,
              primaryHostname: tenantDomains.hostname,
              createdAt: organizations.created_at,
            })
            .from(organizations)
            .leftJoin(
              tenantDomains,
              and(
                eq(tenantDomains.tenant_id, organizations.id),
                eq(tenantDomains.is_primary, true),
              ),
            )
            .orderBy(asc(organizations.created_at), asc(organizations.name));

          return rows;
        });

      const tenantSlugExists = (slug: string) =>
        tryAsync('check tenant slug', async () => {
          const rows = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.slug, slug))
            .limit(1);
          return rows.length > 0;
        });

      const tenantHostnameExists = (hostname: string) =>
        tryAsync('check tenant hostname', async () => {
          const rows = await db
            .select({ id: tenantDomains.id })
            .from(tenantDomains)
            .where(eq(tenantDomains.hostname, hostname))
            .limit(1);
          return rows.length > 0;
        });

      const createTenantWithAdmin = (input: CreateTenantInput) =>
        tryAsync('create tenant with admin', async () => {
          const tenantId = randomUUID();
          const normalizedEmail = normalizeEmail(input.admin.email);
          const passwordHash = await hashPassword(input.admin.password);

          return db.transaction(async (tx) => {
            const [tenant] = await tx
              .insert(organizations)
              .values({
                id: tenantId,
                name: input.name,
                slug: input.slug,
              })
              .returning({
                id: organizations.id,
                name: organizations.name,
                slug: organizations.slug,
              });

            await tx.insert(tenantDomains).values({
              tenant_id: tenantId,
              hostname: input.hostname,
              kind: 'subdomain',
              is_primary: true,
              verified_at: new Date(),
            });

            for (const seed of defaultRoleSeedDefinitions) {
              const [role] = await tx
                .insert(roles)
                .values({
                  tenant_id: tenantId,
                  name: seed.name,
                  description: seed.description,
                  is_system: true,
                })
                .returning({ id: roles.id });

              await tx.insert(rolePermissions).values(
                seed.permissions.map((permission) => ({
                  role_id: role!.id,
                  resource: permission.resource,
                  permission: permission.permission,
                })),
              );
            }

            const existingUserRows = await tx
              .select({
                id: betterAuthUsers.id,
                name: betterAuthUsers.name,
                email: betterAuthUsers.email,
              })
              .from(betterAuthUsers)
              .where(sql`lower(${betterAuthUsers.email}) = ${normalizedEmail}`)
              .limit(1);

            const adminUser =
              existingUserRows[0] ??
              (await (async () => {
                const userId = randomUUID();
                const result = await tx.execute(sql`
                  INSERT INTO "user" (
                    id,
                    name,
                    email,
                    email_verified,
                    role,
                    created_at,
                    updated_at
                  )
                  VALUES (
                    ${userId},
                    ${input.admin.name},
                    ${normalizedEmail},
                    false,
                    'user',
                    NOW(),
                    NOW()
                  )
                  RETURNING id, name, email
                `);

                await tx.execute(sql`
                  INSERT INTO account (
                    id,
                    account_id,
                    provider_id,
                    user_id,
                    password,
                    created_at,
                    updated_at
                  )
                  VALUES (
                    ${randomUUID()},
                    ${userId},
                    'credential',
                    ${userId},
                    ${passwordHash},
                    NOW(),
                    NOW()
                  )
                  ON CONFLICT DO NOTHING
                `);

                return rowsOf<{
                  id: string;
                  name: string | null;
                  email: string | null;
                }>(result)[0]!;
              })());

            await tx
              .insert(members)
              .values({
                id: randomUUID(),
                organization_id: tenantId,
                user_id: adminUser.id,
                role: 'member',
              })
              .onConflictDoNothing();

            const adminRoleRows = await tx
              .select({ id: roles.id })
              .from(roles)
              .where(and(eq(roles.tenant_id, tenantId), eq(roles.name, 'Admin')))
              .limit(1);

            const adminRoleId = adminRoleRows[0]?.id;
            if (!adminRoleId) {
              throw new Error('Admin role seed missing after tenant creation');
            }

            await tx.insert(userRoles).values({
              tenant_id: tenantId,
              user_id: adminUser.id,
              role_id: adminRoleId,
            });

            await tx.insert(platformAuditEvents).values({
              actor_user_id: input.actorUserId,
              action: 'tenant.create',
              entity_type: 'tenant',
              entity_id: tenantId,
              metadata: {
                name: input.name,
                slug: input.slug,
                hostname: input.hostname,
                adminUserId: adminUser.id,
              },
              ip_address: input.ipAddress ?? null,
              user_agent: input.userAgent ?? null,
            });

            return {
              tenant: {
                id: tenant!.id,
                name: tenant!.name,
                slug: tenant!.slug,
                hostname: input.hostname,
              },
              admin: {
                id: adminUser.id,
                email: adminUser.email ?? normalizedEmail,
                name: adminUser.name ?? input.admin.name,
              },
            } satisfies CreatedTenantResult;
          });
        });

      return {
        findSuperAdminUser,
        listTenants,
        tenantSlugExists,
        tenantHostnameExists,
        createTenantWithAdmin,
      };
    }),
  },
) {}
