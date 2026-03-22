import { Effect } from 'effect';
import { eq, or, ilike, and, sql, type SQL } from 'drizzle-orm';
import type { ClientQueryDto } from '@librestock/types/clients';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type RepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase } from '../../platform/drizzle';
import { clients } from '../../platform/db/schema';
import { ClientsInfrastructureError } from './clients.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ClientsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

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
  '@librestock/effect/ClientsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (
        query: ClientQueryDto,
      ): Effect.Effect<RepositoryPaginatedResult<typeof clients.$inferSelect>, ClientsInfrastructureError> =>
        tryAsync('list clients', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const conditions = buildClientFilters(query);
          const where = conditions.length > 0 ? and(...conditions) : undefined;

          const [countResult, data] = await Promise.all([
            db.select({ count: sql<number>`count(*)::int` }).from(clients).where(where),
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

      const findById = (id: string) =>
        tryAsync('load client', async () => {
          const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
          return rows[0] ?? null;
        });

      const findByEmail = (email: string) =>
        tryAsync('load client by email', async () => {
          const rows = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
          return rows[0] ?? null;
        });

      const existsById = (id: string) =>
        tryAsync('check client existence', async () => {
          const rows = await db
            .select({ id: clients.id })
            .from(clients)
            .where(eq(clients.id, id))
            .limit(1);
          return rows.length > 0;
        });

      const create = (data: typeof clients.$inferInsert) =>
        tryAsync('create client', async () => {
          const rows = await db.insert(clients).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof clients.$inferInsert>) =>
        tryAsync('update client', async () => {
          const rows = await db
            .update(clients)
            .set({ ...data, updated_at: new Date() })
            .where(eq(clients.id, id))
            .returning({ id: clients.id });
          return rows.length;
        });

      const remove = (id: string) =>
        tryAsync('delete client', async () => {
          await db.delete(clients).where(eq(clients.id, id));
        });

      return { findAllPaginated, findById, findByEmail, existsById, create, update, delete: remove };
    }),
  },
) {}
