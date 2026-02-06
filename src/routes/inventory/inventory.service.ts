import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Transactional } from '../../common/decorators/transactional.decorator';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { AreasService } from '../areas/areas.service';
import { Inventory } from './entities/inventory.entity';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  AdjustInventoryDto,
  InventoryQueryDto,
  InventoryResponseDto,
  PaginatedInventoryResponseDto,
} from './dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly productsService: ProductsService,
    private readonly locationsService: LocationsService,
    private readonly areasService: AreasService,
  ) {}

  async findAllPaginated(
    query: InventoryQueryDto,
  ): Promise<PaginatedInventoryResponseDto> {
    const result = await this.inventoryRepository.findAllPaginated(query);

    return {
      data: result.data.map((inventory) => this.toResponseDto(inventory)),
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  async findAll(): Promise<InventoryResponseDto[]> {
    const items = await this.inventoryRepository.findAll();
    return items.map((inventory) => this.toResponseDto(inventory));
  }

  async findOne(id: string): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findById(id);
    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }
    return this.toResponseDto(inventory);
  }

  async findByProduct(productId: string): Promise<InventoryResponseDto[]> {
    const exists = await this.productsService.existsById(productId);
    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    const items = await this.inventoryRepository.findByProductId(productId);
    return items.map((inventory) => this.toResponseDto(inventory));
  }

  async findByLocation(locationId: string): Promise<InventoryResponseDto[]> {
    const exists = await this.locationsService.existsById(locationId);
    if (!exists) {
      throw new NotFoundException('Location not found');
    }

    const items = await this.inventoryRepository.findByLocationId(locationId);
    return items.map((inventory) => this.toResponseDto(inventory));
  }

  @Transactional()
  async create(
    createInventoryDto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    // Validate product exists
    const productExists = await this.productsService.existsById(
      createInventoryDto.product_id,
    );
    if (!productExists) {
      throw new BadRequestException('Product not found');
    }

    // Validate location exists
    const locationExists = await this.locationsService.existsById(
      createInventoryDto.location_id,
    );
    if (!locationExists) {
      throw new BadRequestException('Location not found');
    }

    // Validate area exists and belongs to the location
    if (createInventoryDto.area_id) {
      let area: { location_id: string };
      try {
        area = await this.areasService.findById(createInventoryDto.area_id);
      } catch {
        throw new BadRequestException('Area not found');
      }
      if (area.location_id !== createInventoryDto.location_id) {
        throw new BadRequestException('Area must belong to the specified location');
      }
    }

    // Check if inventory for this product/location/area already exists
    const existing = await this.inventoryRepository.findByProductAndLocation(
      createInventoryDto.product_id,
      createInventoryDto.location_id,
      createInventoryDto.area_id,
    );
    if (existing) {
      throw new BadRequestException(
        'Inventory for this product at this location/area already exists. Use the update or adjust endpoint instead.',
      );
    }

    const inventory = await this.inventoryRepository.create({
      product_id: createInventoryDto.product_id,
      location_id: createInventoryDto.location_id,
      area_id: createInventoryDto.area_id ?? null,
      quantity: createInventoryDto.quantity,
      batchNumber: createInventoryDto.batchNumber ?? '',
      expiry_date: createInventoryDto.expiry_date
        ? new Date(createInventoryDto.expiry_date)
        : null,
      cost_per_unit: createInventoryDto.cost_per_unit ?? null,
      received_date: createInventoryDto.received_date
        ? new Date(createInventoryDto.received_date)
        : null,
    });

    // Fetch with relations
    const inventoryWithRelations = await this.inventoryRepository.findById(
      inventory.id,
    );
    return this.toResponseDto(inventoryWithRelations!);
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    const inventory = await this.getInventoryOrFail(id);

    const newLocationId = updateInventoryDto.location_id ?? inventory.location_id;
    const newAreaId = updateInventoryDto.area_id !== undefined
      ? updateInventoryDto.area_id
      : inventory.area_id;

    // Validate location if changing
    if (
      updateInventoryDto.location_id &&
      updateInventoryDto.location_id !== inventory.location_id
    ) {
      const locationExists = await this.locationsService.existsById(
        updateInventoryDto.location_id,
      );
      if (!locationExists) {
        throw new BadRequestException('Location not found');
      }
    }

    // Validate area if provided
    if (newAreaId) {
      let area: { location_id: string };
      try {
        area = await this.areasService.findById(newAreaId);
      } catch {
        throw new BadRequestException('Area not found');
      }
      if (area.location_id !== newLocationId) {
        throw new BadRequestException('Area must belong to the specified location');
      }
    }

    // Check if changing location or area would create a duplicate
    const locationChanged = updateInventoryDto.location_id && updateInventoryDto.location_id !== inventory.location_id;
    const areaChanged = updateInventoryDto.area_id !== undefined && updateInventoryDto.area_id !== inventory.area_id;

    if (locationChanged || areaChanged) {
      const existing = await this.inventoryRepository.findByProductAndLocation(
        inventory.product_id,
        newLocationId,
        newAreaId,
      );
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          'Inventory for this product at the target location/area already exists',
        );
      }
    }

    if (Object.keys(updateInventoryDto).length === 0) {
      return this.toResponseDto(inventory);
    }

    const updateData: Partial<Inventory> = {};

    if (updateInventoryDto.location_id !== undefined) {
      updateData.location_id = updateInventoryDto.location_id;
    }
    if (updateInventoryDto.area_id !== undefined) {
      updateData.area_id = updateInventoryDto.area_id;
    }
    if (updateInventoryDto.quantity !== undefined) {
      updateData.quantity = updateInventoryDto.quantity;
    }
    if (updateInventoryDto.batchNumber !== undefined) {
      updateData.batchNumber = updateInventoryDto.batchNumber ?? '';
    }
    if (updateInventoryDto.expiry_date !== undefined) {
      updateData.expiry_date = updateInventoryDto.expiry_date
        ? new Date(updateInventoryDto.expiry_date)
        : null;
    }
    if (updateInventoryDto.cost_per_unit !== undefined) {
      updateData.cost_per_unit = updateInventoryDto.cost_per_unit;
    }
    if (updateInventoryDto.received_date !== undefined) {
      updateData.received_date = updateInventoryDto.received_date
        ? new Date(updateInventoryDto.received_date)
        : null;
    }

    await this.inventoryRepository.update(id, updateData);

    const updated = await this.inventoryRepository.findById(id);
    return this.toResponseDto(updated!);
  }

  @Transactional()
  async adjustQuantity(
    id: string,
    adjustDto: AdjustInventoryDto,
  ): Promise<InventoryResponseDto> {
    const inventory = await this.getInventoryOrFail(id);

    // Check if adjustment would make quantity negative
    if (inventory.quantity + adjustDto.adjustment < 0) {
      throw new BadRequestException(
        `Cannot adjust quantity by ${adjustDto.adjustment}. Current quantity is ${inventory.quantity}.`,
      );
    }

    const affected = await this.inventoryRepository.adjustQuantity(
      id,
      adjustDto.adjustment,
    );

    if (affected === 0) {
      throw new BadRequestException(
        'Quantity adjustment failed. The resulting quantity would be negative.',
      );
    }

    const updated = await this.inventoryRepository.findById(id);
    return this.toResponseDto(updated!);
  }

  async delete(id: string): Promise<void> {
    await this.getInventoryOrFail(id);
    await this.inventoryRepository.delete(id);
  }

  private async getInventoryOrFail(id: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findById(id);
    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }
    return inventory;
  }

  private toResponseDto(inventory: Inventory): InventoryResponseDto {
    return {
      id: inventory.id,
      product_id: inventory.product_id,
      product: inventory.product
        ? {
            id: inventory.product.id,
            sku: inventory.product.sku,
            name: inventory.product.name,
            unit: inventory.product.unit,
          }
        : null,
      location_id: inventory.location_id,
      location: inventory.location
        ? {
            id: inventory.location.id,
            name: inventory.location.name,
            type: inventory.location.type,
          }
        : null,
      area_id: inventory.area_id,
      area: inventory.area
        ? {
            id: inventory.area.id,
            name: inventory.area.name,
            code: inventory.area.code,
          }
        : null,
      quantity: inventory.quantity,
      batchNumber: inventory.batchNumber,
      expiry_date: inventory.expiry_date,
      cost_per_unit: inventory.cost_per_unit
        ? Number(inventory.cost_per_unit)
        : null,
      received_date: inventory.received_date,
      created_at: inventory.created_at,
      updated_at: inventory.updated_at,
    };
  }
}
