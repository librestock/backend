import { Effect } from 'effect';
import type {
  CreateSuperAdminTenantInput,
  SuperAdminCreateTenantResponse,
  SuperAdminMeResponse,
  SuperAdminTenantListResponse,
} from '@librestock/types/superadmin';
import { hostnameForTenantSlug, isReservedTenantSlug } from '../../platform/host';
import type { UserSession } from '../../platform/auth/user-session';
import { makeServiceTracer } from '../../platform/service-tracer';
import {
  InvalidTenantSlug,
  ReservedTenantSlug,
  TenantHostnameAlreadyExists,
  TenantSlugAlreadyExists,
} from './superadmin.errors';
import { SuperAdminRepository } from './repository';

const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export class SuperAdminService extends Effect.Service<SuperAdminService>()(
  '@librestock/effect/superadmin/SuperAdminService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* SuperAdminRepository;
      const trace = makeServiceTracer({
        serviceName: 'SuperAdminService',
        module: 'superadmin',
        layer: 'service',
        entityType: 'tenant',
      });

      const me = trace.traced('me', (session: UserSession) =>
        Effect.succeed({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.name ?? '',
          isSuperAdmin: true,
        } satisfies SuperAdminMeResponse),
      );

      const listTenants = trace.traced('listTenants', () =>
        Effect.map(
          repository.listTenants(),
          (rows) =>
            ({
              data: rows.map((row) => ({
                id: row.id,
                name: row.name,
                slug: row.slug,
                primaryHostname: row.primaryHostname,
                createdAt: row.createdAt.toISOString(),
              })),
            }) satisfies SuperAdminTenantListResponse,
        ),
      );

      const createTenant = trace.traced(
        'createTenant',
        (
          input: CreateSuperAdminTenantInput,
          actor: {
            readonly userId: string;
            readonly ipAddress?: string | null;
            readonly userAgent?: string | null;
          },
        ) =>
          Effect.gen(function* () {
            const slug = input.slug.trim().toLowerCase();
            if (!TENANT_SLUG_PATTERN.test(slug)) {
              return yield* Effect.fail(
                new InvalidTenantSlug({
                  slug: input.slug,
                  messageKey: 'superadmin.invalidTenantSlug',
                }),
              );
            }

            if (isReservedTenantSlug(slug)) {
              return yield* Effect.fail(
                new ReservedTenantSlug({
                  slug,
                  messageKey: 'superadmin.reservedTenantSlug',
                }),
              );
            }

            const hostname = hostnameForTenantSlug(slug);
            if (yield* repository.tenantSlugExists(slug)) {
              return yield* Effect.fail(
                new TenantSlugAlreadyExists({
                  slug,
                  messageKey: 'superadmin.tenantSlugAlreadyExists',
                }),
              );
            }

            if (yield* repository.tenantHostnameExists(hostname)) {
              return yield* Effect.fail(
                new TenantHostnameAlreadyExists({
                  hostname,
                  messageKey: 'superadmin.tenantHostnameAlreadyExists',
                }),
              );
            }

            return yield* repository.createTenantWithAdmin({
              name: input.name.trim(),
              slug,
              hostname,
              admin: {
                name: input.admin.name.trim(),
                email: input.admin.email.trim().toLowerCase(),
                password: input.admin.password,
              },
              actorUserId: actor.userId,
              ipAddress: actor.ipAddress ?? null,
              userAgent: actor.userAgent ?? null,
            });
          }),
        (input) => ({ attributes: { entityId: input.slug } }),
      );

      return {
        me,
        listTenants,
        createTenant,
      };
    }),
    dependencies: [SuperAdminRepository.Default],
  },
) {}
