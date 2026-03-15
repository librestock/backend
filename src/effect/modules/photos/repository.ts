import { Effect } from 'effect';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Photo } from './entities/photo.entity';
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
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(Photo);

      const findByProductId = (productId: string) =>
        tryAsync('list photos by product', () =>
          repo
            .createQueryBuilder('photo')
            .where('photo.product_id = :productId', { productId })
            .orderBy('photo.display_order', 'ASC')
            .addOrderBy('photo.created_at', 'ASC')
            .getMany(),
        );

      const findById = (id: string) =>
        tryAsync('load photo', () =>
          repo
            .createQueryBuilder('photo')
            .where('photo.id = :id', { id })
            .getOne(),
        );

      const create = (data: Partial<Photo>) =>
        tryAsync('create photo', async () => {
          const photo = repo.create(data);
          return repo.save(photo);
        });

      const remove = (id: string) =>
        tryAsync('delete photo metadata', async () => {
          await repo.delete(id);
        });

      const countByProductId = (productId: string) =>
        tryAsync('count photos by product', () =>
          repo
            .createQueryBuilder('photo')
            .where('photo.product_id = :productId', { productId })
            .getCount(),
        );

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
