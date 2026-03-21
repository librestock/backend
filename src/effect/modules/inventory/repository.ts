import { Effect } from 'effect';
import type { InventoryQueryDto } from '@librestock/types/inventory';
import { InventorySortField } from '@librestock/types/inventory';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryInfrastructureError } from './inventory.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new InventoryInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

const inventoryFilterSpec: QuerySpec<Inventory, InventoryQueryDto> = (
  queryBuilder,
  query,
) => {
  if (query.product_id) {
    queryBuilder.andWhere('inventory.product_id = :product_id', {
      product_id: query.product_id,
    });
  }

  if (query.location_id) {
    queryBuilder.andWhere('inventory.location_id = :location_id', {
      location_id: query.location_id,
    });
  }

  if (query.area_id) {
    queryBuilder.andWhere('inventory.area_id = :area_id', {
      area_id: query.area_id,
    });
  }

  if (query.search) {
    queryBuilder.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
      search: `%${query.search}%`,
    });
  }

  if (query.low_stock) {
    queryBuilder.andWhere('inventory.quantity <= product.reorder_point');
  }

  if (query.expiring_soon) {
    queryBuilder.andWhere(
      'inventory.expiry_date IS NOT NULL AND inventory.expiry_date <= NOW() + INTERVAL \'30 days\'',
    );
  }

  if (query.min_quantity !== undefined && query.max_quantity !== undefined) {
    queryBuilder.andWhere(
      'inventory.quantity BETWEEN :min_quantity AND :max_quantity',
      { min_quantity: query.min_quantity, max_quantity: query.max_quantity },
    );
  } else if (query.min_quantity !== undefined) {
    queryBuilder.andWhere('inventory.quantity >= :min_quantity', {
      min_quantity: query.min_quantity,
    });
  } else if (query.max_quantity !== undefined) {
    queryBuilder.andWhere('inventory.quantity <= :max_quantity', {
      max_quantity: query.max_quantity,
    });
  }
};

const inventorySortSpec: QuerySpec<Inventory, InventoryQueryDto> = (
  queryBuilder,
  query,
) => {
  queryBuilder.orderBy(
    `inventory.${query.sort_by ?? InventorySortField.UPDATED_AT}`,
    query.sort_order ?? 'DESC',
  );
};

export class InventoryRepository extends Effect.Service<InventoryRepository>()(
  '@librestock/effect/InventoryRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repository = dataSource.getRepository(Inventory);

      const findAllPaginated = (query: InventoryQueryDto) =>
        tryAsync('list inventory paginated', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);

          const qb = applyQuerySpecs(
            repository
              .createQueryBuilder('inventory')
              .leftJoinAndSelect('inventory.product', 'product')
              .leftJoinAndSelect('inventory.location', 'location')
              .leftJoinAndSelect('inventory.area', 'area'),
            query,
            [inventoryFilterSpec, inventorySortSpec],
          );

          const total = await qb.getCount();
          const data = await qb.skip(skip).take(limit).getMany();

          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findAll = () =>
        tryAsync('list all inventory', () =>
          repository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .leftJoinAndSelect('inventory.location', 'location')
            .leftJoinAndSelect('inventory.area', 'area')
            .orderBy('inventory.updated_at', 'DESC')
            .getMany(),
        );

      const findById = (id: string) =>
        tryAsync('find inventory by id', () =>
          repository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .leftJoinAndSelect('inventory.location', 'location')
            .leftJoinAndSelect('inventory.area', 'area')
            .where('inventory.id = :id', { id })
            .getOne(),
        );

      const findByProductId = (productId: string) =>
        tryAsync('find inventory by product', () =>
          repository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .leftJoinAndSelect('inventory.location', 'location')
            .leftJoinAndSelect('inventory.area', 'area')
            .where('inventory.product_id = :productId', { productId })
            .orderBy('inventory.updated_at', 'DESC')
            .getMany(),
        );

      const findByLocationId = (locationId: string) =>
        tryAsync('find inventory by location', () =>
          repository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .leftJoinAndSelect('inventory.location', 'location')
            .leftJoinAndSelect('inventory.area', 'area')
            .where('inventory.location_id = :locationId', { locationId })
            .orderBy('inventory.updated_at', 'DESC')
            .getMany(),
        );

      const findByProductAndLocation = (productId: string, locationId: string, areaId?: string | null) =>
        tryAsync('find inventory by product and location', async () => {
          const qb = repository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .leftJoinAndSelect('inventory.location', 'location')
            .leftJoinAndSelect('inventory.area', 'area')
            .where('inventory.product_id = :productId', { productId })
            .andWhere('inventory.location_id = :locationId', { locationId });

          if (areaId) {
            qb.andWhere('inventory.area_id = :areaId', { areaId });
          } else {
            qb.andWhere('inventory.area_id IS NULL');
          }

          return qb.getOne();
        });

      const create = (data: Partial<Inventory>) =>
        tryAsync('create inventory', async () => {
          const inventory = repository.create(data);
          return repository.save(inventory);
        });

      const update = (id: string, data: Partial<Inventory>) =>
        tryAsync('update inventory', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Inventory)
            .set(data)
            .where('id = :id', { id })
            .execute();

          return result.affected ?? 0;
        });

      const adjustQuantity = (id: string, adjustment: number) =>
        tryAsync('adjust inventory quantity', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Inventory)
            .set({
              quantity: () => 'quantity + :adjustment',
            })
            .where('id = :id', { id })
            .andWhere('quantity + :adjustment >= 0', { adjustment })
            .setParameter('adjustment', adjustment)
            .execute();

          return result.affected ?? 0;
        });

      const remove = (id: string) =>
        tryAsync('delete inventory', () => repository.delete(id));

      return {
        findAllPaginated,
        findAll,
        findById,
        findByProductId,
        findByLocationId,
        findByProductAndLocation,
        create,
        update,
        adjustQuantity,
        delete: remove,
      };
    }),
  },
) {}
