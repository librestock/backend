import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Transactional } from '../../common/decorators/transactional.decorator';
import { LocationsService } from '../locations/locations.service';
import { AreaRepository } from './area.repository';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaQueryDto } from './dto/area-query.dto';
import { AreaResponseDto } from './dto/area-response.dto';

@Injectable()
export class AreasService {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly locationsService: LocationsService,
  ) {}

  async create(dto: CreateAreaDto): Promise<AreaResponseDto> {
    // Validate location exists
    const locationExists = await this.locationsService.existsById(
      dto.location_id,
    );
    if (!locationExists) {
      throw new BadRequestException(
        `Location with ID ${dto.location_id} not found`,
      );
    }

    // Validate parent area exists and belongs to same location
    if (dto.parent_id) {
      const parentArea = await this.areaRepository.findById(dto.parent_id);
      if (!parentArea) {
        throw new BadRequestException(
          `Parent area with ID ${dto.parent_id} not found`,
        );
      }
      if (parentArea.location_id !== dto.location_id) {
        throw new BadRequestException(
          'Parent area must belong to the same location',
        );
      }
    }

    const area = await this.areaRepository.create(dto);
    return this.toResponseDto(area);
  }

  async findAll(query: AreaQueryDto): Promise<AreaResponseDto[]> {
    if (query.include_children && query.location_id) {
      const areas = await this.areaRepository.findHierarchyByLocationId(
        query.location_id,
      );
      return areas.map((area) => this.toResponseDto(area));
    }
    const areas = await this.areaRepository.findAll(query);
    return areas.map((area) => this.toResponseDto(area));
  }

  async findById(id: string): Promise<AreaResponseDto> {
    const area = await this.areaRepository.findById(id);
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return this.toResponseDto(area);
  }

  async findByIdWithChildren(id: string): Promise<AreaResponseDto> {
    const area = await this.areaRepository.findByIdWithChildren(id);
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return this.toResponseDto(area);
  }

  async findByLocationId(locationId: string): Promise<AreaResponseDto[]> {
    const areas = await this.areaRepository.findByLocationId(locationId);
    return areas.map((area) => this.toResponseDto(area));
  }

  async findHierarchyByLocationId(
    locationId: string,
  ): Promise<AreaResponseDto[]> {
    const areas = await this.areaRepository.findHierarchyByLocationId(
      locationId,
    );
    return areas.map((area) => this.toResponseDto(area));
  }

  @Transactional()
  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponseDto> {
    const existingArea = await this.areaRepository.findById(id);
    if (!existingArea) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }

    // Validate parent area if being updated
    if (dto.parent_id !== undefined && dto.parent_id !== null) {
      if (dto.parent_id === id) {
        throw new BadRequestException('Area cannot be its own parent');
      }

      const parentArea = await this.areaRepository.findById(dto.parent_id);
      if (!parentArea) {
        throw new BadRequestException(
          `Parent area with ID ${dto.parent_id} not found`,
        );
      }
      if (parentArea.location_id !== existingArea.location_id) {
        throw new BadRequestException(
          'Parent area must belong to the same location',
        );
      }

      // Check for circular reference
      if (await this.wouldCreateCircularReference(id, dto.parent_id)) {
        throw new BadRequestException(
          'Cannot set parent: would create circular reference',
        );
      }
    }

    const updated = await this.areaRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return this.toResponseDto(updated);
  }

  async delete(id: string): Promise<void> {
    const exists = await this.areaRepository.existsById(id);
    if (!exists) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }

    // Note: Children will be deleted via CASCADE
    const deleted = await this.areaRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
  }

  private async wouldCreateCircularReference(
    areaId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === areaId) {
        return true;
      }
      const parent = await this.areaRepository.findById(currentId);
      currentId = parent?.parent_id ?? null;
    }

    return false;
  }

  private toResponseDto(area: Area): AreaResponseDto {
    return {
      id: area.id,
      location_id: area.location_id,
      parent_id: area.parent_id,
      name: area.name,
      code: area.code,
      description: area.description,
      is_active: area.is_active,
      created_at: area.created_at,
      updated_at: area.updated_at,
      children: area.children?.map((child) => this.toResponseDto(child)),
    };
  }
}
