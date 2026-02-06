import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { StockMovement } from './entities/stock-movement.entity';
import {
  CreateStockMovementDto,
  StockMovementQueryDto,
  StockMovementResponseDto,
  PaginatedStockMovementsResponseDto,
} from './dto';
import { StockMovementRepository } from './stock-movement.repository';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly productsService: ProductsService,
    private readonly locationsService: LocationsService,
  ) {}

  async findAllPaginated(
    query: StockMovementQueryDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    const result =
      await this.stockMovementRepository.findAllPaginated(query);

    return {
      data: result.data.map((sm) => this.toResponseDto(sm)),
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  async findOne(id: string): Promise<StockMovementResponseDto> {
    const movement = await this.stockMovementRepository.findById(id);
    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }
    return this.toResponseDto(movement);
  }

  async findByProduct(
    productId: string,
  ): Promise<StockMovementResponseDto[]> {
    const exists = await this.productsService.existsById(productId);
    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    const movements =
      await this.stockMovementRepository.findByProductId(productId);
    return movements.map((sm) => this.toResponseDto(sm));
  }

  async findByLocation(
    locationId: string,
  ): Promise<StockMovementResponseDto[]> {
    const exists = await this.locationsService.existsById(locationId);
    if (!exists) {
      throw new NotFoundException('Location not found');
    }

    const movements =
      await this.stockMovementRepository.findByLocationId(locationId);
    return movements.map((sm) => this.toResponseDto(sm));
  }

  async create(
    dto: CreateStockMovementDto,
    userId: string,
  ): Promise<StockMovementResponseDto> {
    // Validate product exists
    const productExists = await this.productsService.existsById(dto.product_id);
    if (!productExists) {
      throw new BadRequestException('Product not found');
    }

    // Validate from_location exists if provided
    if (dto.from_location_id) {
      const fromExists = await this.locationsService.existsById(
        dto.from_location_id,
      );
      if (!fromExists) {
        throw new BadRequestException('Source location not found');
      }
    }

    // Validate to_location exists if provided
    if (dto.to_location_id) {
      const toExists = await this.locationsService.existsById(
        dto.to_location_id,
      );
      if (!toExists) {
        throw new BadRequestException('Destination location not found');
      }
    }

    const movement = await this.stockMovementRepository.create({
      product_id: dto.product_id,
      from_location_id: dto.from_location_id ?? null,
      to_location_id: dto.to_location_id ?? null,
      quantity: dto.quantity,
      reason: dto.reason,
      order_id: dto.order_id ?? null,
      reference_number: dto.reference_number ?? null,
      cost_per_unit: dto.cost_per_unit ?? null,
      notes: dto.notes ?? null,
      user_id: userId,
    });

    // Re-fetch with relations
    const movementWithRelations = await this.stockMovementRepository.findById(
      movement.id,
    );
    return this.toResponseDto(movementWithRelations!);
  }

  private toResponseDto(sm: StockMovement): StockMovementResponseDto {
    return {
      id: sm.id,
      product_id: sm.product_id,
      product: sm.product
        ? { id: sm.product.id, name: sm.product.name, sku: sm.product.sku }
        : null,
      from_location_id: sm.from_location_id,
      from_location: sm.fromLocation
        ? { id: sm.fromLocation.id, name: sm.fromLocation.name }
        : null,
      to_location_id: sm.to_location_id,
      to_location: sm.toLocation
        ? { id: sm.toLocation.id, name: sm.toLocation.name }
        : null,
      quantity: sm.quantity,
      reason: sm.reason,
      order_id: sm.order_id,
      reference_number: sm.reference_number,
      cost_per_unit: sm.cost_per_unit,
      user_id: sm.user_id,
      notes: sm.notes,
      created_at: sm.created_at,
    };
  }
}
