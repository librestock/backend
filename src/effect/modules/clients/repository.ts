import { Effect } from 'effect';
import { eq, or, ilike, sql, type SQL } from 'drizzle-orm';
import type { ClientQueryDto } from '@librestock/types/clients';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type RepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { clients } from '../../platform/db/schema';
import type { TenantNotResolved } from '../../platform/tenant-context';
import { TenantQuery } from '../../platform/tenant-query';
import { ClientsInfrastructureError } from './clients.errors';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new ClientsInfrastructureError({
      action,
      cause,
      messageKey: 'clients.repositoryFailed',
    }),
);

function buildClientFilters(query: ClientQueryDto): SQL[] {
  const conditions: SQL[] = [];
  if (query.q) {
    conditions.push(
      or(
        ilike(clients.company_name, `%${query.q}%`),
        ilike(clients.email, `%${query.q}%`),
      )!,
    );
  }
  if (query.account_status) {
    conditions.push(eq(clients.account_status, query.account_status));
  }
  return conditions;
}

export class ClientsRepository extends Effect.Service<ClientsRepository>()(
  '@librestock/effect/clients/ClientsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;
      const tenantQuery = yield* TenantQuery;

      const findAllPaginated = (
        query: ClientQueryDto,
      ): Effect.Effect<
        RepositoryPaginatedResult<typeof clients.$inferSelect>,
        ClientsInfrastructureError | TenantNotResolved
      > =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(
            clients,
            ...buildClientFilters(query),
          );
          return yield* tryAsync('list clients', async () => {
            const { page, limit, skip } = resolvePaginationWindow(
              query.page,
              query.limit,
            );

            const [countResult, data] = await Promise.all([
              db
                .select({ count: sql<number>`count(*)::int` })
                .from(clients)
                .where(where),
              db
                .select()
                .from(clients)
                .where(where)
                .orderBy(sql`"company_name" ASC`)
                .offset(skip)
                .limit(limit),
            ]);

            const total = countResult[0]?.count ?? 0;
            return toRepositoryPaginatedResult(data, total, page, limit);
          });
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(clients, id);
          return yield* tryAsync('load client', async () => {
            const rows = await db.select().from(clients).where(where).limit(1);
            return rows[0] ?? null;
          });
        });

      const findByEmail = (email: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(
            clients,
            eq(clients.email, email),
          );
          return yield* tryAsync('load client by email', async () => {
            const rows = await db.select().from(clients).where(where).limit(1);
            return rows[0] ?? null;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(clients, id);
          return yield* tryAsync('check client existence', async () => {
            const rows = await db
              .select({ id: clients.id })
              .from(clients)
              .where(where)
              .limit(1);
            return rows.length > 0;
          });
        });

      const create = (data: typeof clients.$inferInsert) =>
        Effect.gen(function* () {
          const values = yield* tenantQuery.insertValues(data);
          return yield* tryAsync('create client', async () => {
            const rows = await db.insert(clients).values(values).returning();
            return rows[0]!;
          });
        });

      const update = (
        id: string,
        data: Omit<Partial<typeof clients.$inferInsert>, 'tenant_id'>,
      ) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(clients, id);
          return yield* tryAsync('update client', async () => {
            const { tenant_id: _tenantId, ...updateData } = data as Partial<
              typeof clients.$inferInsert
            >;
            const rows = await db
              .update(clients)
              .set({ ...updateData, updated_at: new Date() })
              .where(where)
              .returning({ id: clients.id });
            return rows.length;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(clients, id);
          return yield* tryAsync('delete client', async () => {
            await db.delete(clients).where(where);
          });
        });

      return {
        findAllPaginated,
        findById,
        findByEmail,
        existsById,
        create,
        update,
        delete: remove,
      };
    }),
    dependencies: [TenantQuery.Default],
  },
) {}
