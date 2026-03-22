import { Effect } from 'effect';
import { eq, asc, sql } from 'drizzle-orm';
import { DrizzleDatabase } from '../../platform/drizzle';
import { photos } from '../../platform/db/schema';
import { PhotosInfrastructureError } from './photos.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new PhotosInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class PhotosRepository extends Effect.Service<PhotosRepository>()(
  '@librestock/effect/PhotosRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findByProductId = (productId: string) =>
        tryAsync('list photos by product', () =>
          db
            .select()
            .from(photos)
            .where(eq(photos.product_id, productId))
            .orderBy(asc(photos.display_order), asc(photos.created_at)),
        );

      const findById = (id: string) =>
        tryAsync('load photo', async () => {
          const rows = await db
            .select()
            .from(photos)
            .where(eq(photos.id, id))
            .limit(1);
          return rows[0] ?? null;
        });

      const create = (data: typeof photos.$inferInsert) =>
        tryAsync('create photo', async () => {
          const rows = await db.insert(photos).values(data).returning();
          return rows[0]!;
        });

      const remove = (id: string) =>
        tryAsync('delete photo metadata', async () => {
          await db.delete(photos).where(eq(photos.id, id));
        });

      const countByProductId = (productId: string) =>
        tryAsync('count photos by product', async () => {
          const rows = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(photos)
            .where(eq(photos.product_id, productId));
          return rows[0]?.count ?? 0;
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
