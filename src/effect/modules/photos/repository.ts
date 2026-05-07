import { Effect } from 'effect';
import { eq, asc, sql, and } from 'drizzle-orm';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { photos } from '../../platform/db/schema';
import { requireRequestTenantId } from '../../platform/tenant-context';
import { PhotosInfrastructureError } from './photos.errors';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new PhotosInfrastructureError({
      action,
      cause,
      messageKey: 'photos.repositoryFailed',
    }),
);

export class PhotosRepository extends Effect.Service<PhotosRepository>()(
  '@librestock/effect/photos/PhotosRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;
      const tenantOwnsProduct = (tenantId: string) =>
        sql`${photos.product_id} IN (SELECT id FROM products WHERE tenant_id = ${tenantId})`;

      const findByProductId = (productId: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('list photos by product', () =>
            db
              .select()
              .from(photos)
              .where(
                and(
                  eq(photos.product_id, productId),
                  tenantOwnsProduct(tenantId),
                ),
              )
              .orderBy(asc(photos.display_order), asc(photos.created_at)),
          );
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load photo', async () => {
            const rows = await db
              .select()
              .from(photos)
              .where(and(eq(photos.id, id), tenantOwnsProduct(tenantId)))
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const create = (data: typeof photos.$inferInsert) =>
        Effect.gen(function* () {
          yield* requireRequestTenantId;
          return yield* tryAsync('create photo', async () => {
            const rows = await db.insert(photos).values(data).returning();
            return rows[0]!;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('delete photo metadata', async () => {
            await db
              .delete(photos)
              .where(and(eq(photos.id, id), tenantOwnsProduct(tenantId)));
          });
        });

      const countByProductId = (productId: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('count photos by product', async () => {
            const rows = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(photos)
              .where(
                and(
                  eq(photos.product_id, productId),
                  tenantOwnsProduct(tenantId),
                ),
              );
            return rows[0]?.count ?? 0;
          });
        });

      return {
        findByProductId,
        findById,
        create,
        delete: remove,
        countByProductId,
      };
    }),
  },
) {}
