import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../../common/utils/query-spec.utils';
import type { Schema } from 'effect';
import type {
  InventoryQuerySchema,
} from '../../../routes/inventory/inventory.schema';
import { InventorySortField } from '../../../routes/inventory/dto';
import { Inventory } from '../../../routes/inventory/entities/inventory.entity';
import { TypeOrmDataSource } from '../../platform/typeorm';

type InventoryQueryDto = Schema.Schema.Type<typeof InventoryQuerySchema>;

export interface InventoryRepository {
  readonly findAllPaginated: (
    query: InventoryQueryDto,
  ) => Promise<RepositoryPaginatedResult<Inventory>>;
  readonly findAll: () => Promise<Inventory[]>;
  readonly findById: (id: string) => Promise<Inventory | null>;
  readonly findByProductId: (productId: string) => Promise<Inventory[]>;
  readonly findByLocationId: (locationId: string) => Promise<Inventory[]>;
  readonly findByProductAndLocation: (
    productId: string,
    locationId: string,
    areaId?: string | null,
  ) => Promise<Inventory | null>;
  readonly create: (data: Partial<Inventory>) => Promise<Inventory>;
  readonly update: (id: string, data: Partial<Inventory>) => Promise<number>;
  readonly adjustQuantity: (id: string, adjustment: number) => Promise<number>;
  readonly delete: (id: string) => Promise<void>;
}

export const InventoryRepository = Context.GenericTag<InventoryRepository>(
  '@librestock/effect/InventoryRepository',
);

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

const createInventoryRepository = (
  repository: Repository<Inventory>,
): InventoryRepository => ({
  findAllPaginated: async (query) => {
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
  },
  findAll: () =>
    repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .orderBy('inventory.updated_at', 'DESC')
      .getMany(),
  findById: (id) =>
    repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.id = :id', { id })
      .getOne(),
  findByProductId: (productId) =>
    repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.product_id = :productId', { productId })
      .orderBy('inventory.updated_at', 'DESC')
      .getMany(),
  findByLocationId: (locationId) =>
    repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.location_id = :locationId', { locationId })
      .orderBy('inventory.updated_at', 'DESC')
      .getMany(),
  findByProductAndLocation: (productId, locationId, areaId) => {
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
  },
  create: async (data) => {
    const inventory = repository.create(data);
    return repository.save(inventory);
  },
  update: async (id, data) => {
    const result = await repository
      .createQueryBuilder()
      .update(Inventory)
      .set(data)
      .where('id = :id', { id })
      .execute();

    return result.affected ?? 0;
  },
  adjustQuantity: async (id, adjustment) => {
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
  },
  delete: async (id) => {
    await repository.delete(id);
  },
});

export const makeInventoryRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createInventoryRepository(dataSource.getRepository(Inventory));
});
