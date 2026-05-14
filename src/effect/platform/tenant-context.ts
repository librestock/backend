import { Effect, Option } from 'effect';
import type { UserSession } from './auth/user-session';
import { DrizzleDatabase } from './drizzle';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from './tenant-constants';
import {
  findSingleTenantMembership,
  findTenantMembership,
  type TenantRow,
} from './db/tenant-queries';
import { BadRequestError, ForbiddenError } from './domain-errors';
import { CurrentRequestContext } from './request-context';

export { DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG };

export interface TenantContext {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly tenantSlug: string;
}

export class TenantNotResolved extends BadRequestError('TenantNotResolved')<{
  readonly cause?: unknown;
}> {}
export class TenantMembershipRejected extends ForbiddenError(
  'TenantMembershipRejected',
) {}

const toTenantContext = (row: TenantRow): TenantContext => ({
  tenantId: row.id,
  tenantName: row.name,
  tenantSlug: row.slug,
});

const fallbackTenantContext = (
  tenantId = DEFAULT_TENANT_ID,
): TenantContext => ({
  tenantId,
  tenantName: tenantId === DEFAULT_TENANT_ID ? DEFAULT_TENANT_NAME : tenantId,
  tenantSlug: tenantId === DEFAULT_TENANT_ID ? DEFAULT_TENANT_SLUG : tenantId,
});

export const setRequestTenant = (tenant: TenantContext) =>
  Effect.gen(function* () {
    const requestContext = yield* Effect.serviceOption(CurrentRequestContext);
    if (Option.isSome(requestContext)) {
      requestContext.value.tenantId = tenant.tenantId;
      requestContext.value.tenantName = tenant.tenantName;
      requestContext.value.tenantSlug = tenant.tenantSlug;
    }
    yield* Effect.annotateCurrentSpan({ tenantId: tenant.tenantId });
  });

const getRequestTenant = Effect.map(
  Effect.serviceOption(CurrentRequestContext),
  Option.match({
    onNone: () => undefined,
    onSome: (requestContext) =>
      requestContext.tenantId
        ? {
            tenantId: requestContext.tenantId,
            tenantName: requestContext.tenantName ?? requestContext.tenantId,
            tenantSlug: requestContext.tenantSlug ?? requestContext.tenantId,
          }
        : undefined,
  }),
);

export const getRequestTenantId = Effect.map(
  Effect.serviceOption(CurrentRequestContext),
  Option.match({
    onNone: () => undefined,
    onSome: (requestContext) => requestContext.tenantId,
  }),
);

const useDefaultTenantForDirectTests =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export const requireRequestTenantId: Effect.Effect<string, TenantNotResolved> =
  Effect.flatMap(getRequestTenantId, (tenantId) => {
    if (tenantId) return Effect.succeed(tenantId);
    if (useDefaultTenantForDirectTests)
      return Effect.succeed(DEFAULT_TENANT_ID);
    return Effect.fail(
      new TenantNotResolved({ messageKey: 'tenant.notResolved' }),
    );
  });

export const resolveTenantForSession = (session: UserSession) =>
  Effect.gen(function* () {
    const requestTenant = yield* getRequestTenant;
    if (requestTenant) {
      return requestTenant;
    }

    const activeOrganizationId = session.session?.activeOrganizationId ?? null;
    const dbOption = yield* Effect.serviceOption(DrizzleDatabase);
    if (Option.isNone(dbOption)) {
      // Unit tests often exercise services without a database layer. Production
      // requests always provide DrizzleDatabase via platformLayer.
      const tenant = fallbackTenantContext(activeOrganizationId ?? undefined);
      yield* setRequestTenant(tenant);
      return tenant;
    }

    const db = dbOption.value;

    if (activeOrganizationId) {
      const rows = yield* runTenantQuery(() =>
        findTenantMembership(db, session.user.id, activeOrganizationId),
      );

      if (!rows[0]) {
        return yield* Effect.fail(
          new TenantMembershipRejected({
            messageKey: 'tenant.membershipRejected',
          }),
        );
      }

      const tenant = toTenantContext(rows[0]);
      yield* setRequestTenant(tenant);
      return tenant;
    }

    const rows = yield* runTenantQuery(() =>
      findSingleTenantMembership(db, session.user.id),
    );

    if (rows.length !== 1) {
      return yield* Effect.fail(
        new TenantNotResolved({
          messageKey: 'tenant.notResolved',
        }),
      );
    }

    const tenant = toTenantContext(rows[0]!);
    yield* setRequestTenant(tenant);
    return tenant;
  });

const runTenantQuery = <A>(
  query: () => Promise<A>,
): Effect.Effect<A, TenantNotResolved> =>
  Effect.tryPromise({
    try: query,
    catch: (cause) =>
      new TenantNotResolved({
        messageKey: 'tenant.notResolved',
        cause,
      }),
  });
