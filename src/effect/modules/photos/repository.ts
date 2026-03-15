import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Photo } from '../../../routes/photos/entities/photo.entity';

export interface PhotosRepository {
  readonly findByProductId: (productId: string) => Promise<Photo[]>;
  readonly findById: (id: string) => Promise<Photo | null>;
  readonly create: (data: Partial<Photo>) => Promise<Photo>;
  readonly delete: (id: string) => Promise<void>;
  readonly countByProductId: (productId: string) => Promise<number>;
}

export const PhotosRepository = Context.GenericTag<PhotosRepository>(
  '@librestock/effect/PhotosRepository',
);

const createPhotosRepository = (
  repository: Repository<Photo>,
): PhotosRepository => ({
  findByProductId: async (productId) =>
    repository
      .createQueryBuilder('photo')
      .where('photo.product_id = :productId', { productId })
      .orderBy('photo.display_order', 'ASC')
      .addOrderBy('photo.created_at', 'ASC')
      .getMany(),
  findById: (id) =>
    repository
      .createQueryBuilder('photo')
      .where('photo.id = :id', { id })
      .getOne(),
  create: async (data) => {
    const photo = repository.create(data);
    return repository.save(photo);
  },
  delete: async (id) => {
    await repository.delete(id);
  },
  countByProductId: async (productId) =>
    repository
      .createQueryBuilder('photo')
      .where('photo.product_id = :productId', { productId })
      .getCount(),
});

export const makePhotosRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;
  return createPhotosRepository(dataSource.getRepository(Photo));
});
