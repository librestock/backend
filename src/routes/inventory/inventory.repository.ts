import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryQueryDto, InventorySortField, SortOrder } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(Inventory)
    private readonly repository: Repository<Inventory>,
  ) {}

  async findAllPaginated(
    query: InventoryQueryDto,
  ): Promise<PaginatedResult<Inventory>> {
    const {
      page = 1,
      limit = 20,
      product_id,
      location_id,
      area_id,
      search,
      low_stock,
      expiring_soon,
      min_quantity,
      max_quantity,
      sort_by = InventorySortField.UPDATED_AT,
      sort_order = SortOrder.DESC,
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.area', 'area');

    // Product filter
    if (product_id) {
      queryBuilder.andWhere('inventory.product_id = :product_id', {
        product_id,
      });
    }

    // Location filter
    if (location_id) {
      queryBuilder.andWhere('inventory.location_id = :location_id', {
        location_id,
      });
    }

    // Area filter
    if (area_id) {
      queryBuilder.andWhere('inventory.area_id = :area_id', {
        area_id,
      });
    }

    // Search in batch number
    if (search) {
      queryBuilder.andWhere('inventory.batch_number ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Low stock filter (quantity <= product's reorder_point)
    if (low_stock) {
      queryBuilder.andWhere('inventory.quantity <= product.reorder_point');
    }

    // Expiring soon filter (within 30 days)
    if (expiring_soon) {
      queryBuilder.andWhere(
        'inventory.expiry_date IS NOT NULL AND inventory.expiry_date <= NOW() + INTERVAL \'30 days\'',
      );
    }

    // Quantity range filter
    if (min_quantity !== undefined && max_quantity !== undefined) {
      queryBuilder.andWhere(
        'inventory.quantity BETWEEN :min_quantity AND :max_quantity',
        { min_quantity, max_quantity },
      );
    } else if (min_quantity !== undefined) {
      queryBuilder.andWhere('inventory.quantity >= :min_quantity', {
        min_quantity,
      });
    } else if (max_quantity !== undefined) {
      queryBuilder.andWhere('inventory.quantity <= :max_quantity', {
        max_quantity,
      });
    }

    // Sorting
    const sortColumn = `inventory.${sort_by}`;
    queryBuilder.orderBy(sortColumn, sort_order);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
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
