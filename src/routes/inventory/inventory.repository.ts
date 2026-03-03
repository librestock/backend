import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../common/utils/query-spec.utils';
import { Inventory } from './entities/inventory.entity';
import { InventoryQueryDto, InventorySortField, SortOrder } from './dto';

export type PaginatedResult<T> = RepositoryPaginatedResult<T>;

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
    queryBuilder.andWhere('inventory.batch_number ILIKE :search', {
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
  const sortBy = query.sort_by ?? InventorySortField.UPDATED_AT;
  const sortOrder = query.sort_order ?? SortOrder.DESC;
  queryBuilder.orderBy(`inventory.${sortBy}`, sortOrder);
};

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(Inventory)
    private readonly repository: Repository<Inventory>,
  ) {}

  async findAllPaginated(
    query: InventoryQueryDto,
  ): Promise<PaginatedResult<Inventory>> {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);

    const queryBuilder = applyQuerySpecs(
      this.repository
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.product', 'product')
        .leftJoinAndSelect('inventory.location', 'location')
        .leftJoinAndSelect('inventory.area', 'area'),
      query,
      [inventoryFilterSpec, inventorySortSpec],
    );

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  }

  async findAll(): Promise<Inventory[]> {
    return this.repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .orderBy('inventory.updated_at', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<Inventory | null> {
    return this.repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.id = :id', { id })
      .getOne();
  }

  async findByProductId(productId: string): Promise<Inventory[]> {
    return this.repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.product_id = :productId', { productId })
      .orderBy('inventory.updated_at', 'DESC')
      .getMany();
  }

  async findByLocationId(locationId: string): Promise<Inventory[]> {
    return this.repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.location_id = :locationId', { locationId })
      .orderBy('inventory.updated_at', 'DESC')
      .getMany();
  }

  async findByAreaId(areaId: string): Promise<Inventory[]> {
    return this.repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area')
      .where('inventory.area_id = :areaId', { areaId })
      .orderBy('inventory.updated_at', 'DESC')
      .getMany();
  }

  async findByProductAndLocation(
    productId: string,
    locationId: string,
    areaId?: string | null,
  ): Promise<Inventory | null> {
    const qb = this.repository
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
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('inventory')
      .where('inventory.id = :id', { id })
      .getCount();
    return count > 0;
  }

  async create(createData: Partial<Inventory>): Promise<Inventory> {
    const inventory = this.repository.create(createData);
    return this.repository.save(inventory);
  }

  async update(id: string, updateData: Partial<Inventory>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Inventory)
      .set(updateData)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  }

  async adjustQuantity(id: string, adjustment: number): Promise<number> {
    const result = await this.repository
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
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
