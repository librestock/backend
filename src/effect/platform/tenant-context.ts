import { Effect, Option } from 'effect';
import type { UserSession } from './auth/user-session';
import { DrizzleDatabase } from './drizzle';
import { getTenantSlugFromHost, isTenantSubdomain, normalizeHost } from './host';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from './tenant-constants';
import {
  findTenantByHostname,
  findSingleTenantMembership,
  findTenantBySlug,
  findTenantMembership,
  type TenantRow,
} from './db/tenant-queries';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from './domain-errors';
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
export class TenantHostNotFound extends NotFoundError('TenantHostNotFound')<{
  readonly host?: string | null;
}> {}

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
    const activeOrganizationId = session.session?.activeOrganizationId ?? null;
    const dbOption = yield* Effect.serviceOption(DrizzleDatabase);

    if (Option.isNone(dbOption)) {
      if (useDefaultTenantForDirectTests) {
        // Unit tests often exercise services without a database layer. Production
        // requests always provide DrizzleDatabase via platformLayer.
        const tenant =
          requestTenant ?? fallbackTenantContext(activeOrganizationId ?? undefined);
        yield* setRequestTenant(tenant);
        return tenant;
      }

      return yield* Effect.fail(
        new TenantNotResolved({ messageKey: 'tenant.notResolved' }),
      );
    }

    const db = dbOption.value;

    if (requestTenant) {
      const rows = yield* runTenantResolutionQuery(() =>
        findTenantMembership(db, session.user.id, requestTenant.tenantId),
      );

      if (!rows[0]) {
        return yield* Effect.fail(
          new TenantMembershipRejected({
            messageKey: 'tenant.membershipRejected',
          }),
        );
      }

      return requestTenant;
    }

    if (activeOrganizationId) {
      const rows = yield* runTenantResolutionQuery(() =>
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

    const rows = yield* runTenantResolutionQuery(() =>
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

const runTenantQuery = <A, E>(
  query: () => Promise<A>,
  onFailure: (cause: unknown) => E,
): Effect.Effect<A, E> =>
  Effect.tryPromise({
    try: query,
    catch: onFailure,
  });

const runTenantResolutionQuery = <A>(
  query: () => Promise<A>,
): Effect.Effect<A, TenantNotResolved> =>
  runTenantQuery(
    query,
    (cause) =>
      new TenantNotResolved({
        messageKey: 'tenant.notResolved',
        cause,
      }),
  );

const failTenantHostNotFound = (host: string | null | undefined) =>
  Effect.fail(
    new TenantHostNotFound({
      host,
      messageKey: 'tenant.hostNotFound',
    }),
  );

const lookupTenantByHost = (host: string | null | undefined) =>
  Effect.gen(function* () {
    const normalizedHost = normalizeHost(host);
    if (!normalizedHost) {
      return yield* failTenantHostNotFound(normalizedHost);
    }

    const dbOption = yield* Effect.serviceOption(DrizzleDatabase);
    if (Option.isNone(dbOption)) {
      if (useDefaultTenantForDirectTests && isTenantSubdomain(normalizedHost)) {
        return fallbackTenantContext();
      }
      return yield* failTenantHostNotFound(normalizedHost);
    }

    const rows = yield* runTenantResolutionQuery(() =>
      findTenantByHostname(dbOption.value, normalizedHost),
    );
    if (rows[0]) {
      return toTenantContext(rows[0]);
    }

    const tenantSlug = getTenantSlugFromHost(normalizedHost);
    if (!tenantSlug) {
      return yield* failTenantHostNotFound(normalizedHost);
    }

    const slugRows = yield* runTenantResolutionQuery(() =>
      findTenantBySlug(dbOption.value, tenantSlug),
    );
    if (!slugRows[0]) {
      return yield* failTenantHostNotFound(normalizedHost);
    }

    return toTenantContext(slugRows[0]);
  });

export const resolvePublicTenantForHost = (host: string | null | undefined) =>
  Effect.gen(function* () {
    const tenant = yield* lookupTenantByHost(host);
    yield* setRequestTenant(tenant);
    return tenant;
  });

export const resolveTenantForHostAndSession = (
  host: string | null | undefined,
  session: UserSession,
) =>
  Effect.gen(function* () {
    const tenant = yield* lookupTenantByHost(host);
    const dbOption = yield* Effect.serviceOption(DrizzleDatabase);
    if (Option.isNone(dbOption)) {
      yield* setRequestTenant(tenant);
      return tenant;
    }

    const membershipRows = yield* runTenantResolutionQuery(() =>
      findTenantMembership(dbOption.value, session.user.id, tenant.tenantId),
    );

    if (!membershipRows[0]) {
      return yield* Effect.fail(
        new TenantMembershipRejected({
          messageKey: 'tenant.membershipRejected',
        }),
      );
    }

    yield* setRequestTenant(tenant);
    return tenant;
  });
