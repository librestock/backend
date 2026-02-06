import { Injectable, NotFoundException } from '@nestjs/common';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { Location } from './entities/location.entity';
import {
  CreateLocationDto,
  UpdateLocationDto,
  LocationQueryDto,
  LocationResponseDto,
  PaginatedLocationsResponseDto,
} from './dto';
import { LocationRepository } from './location.repository';

@Injectable()
export class LocationsService {
  constructor(private readonly locationRepository: LocationRepository) {}

  async findAllPaginated(
    query: LocationQueryDto,
  ): Promise<PaginatedLocationsResponseDto> {
    const result = await this.locationRepository.findAllPaginated(query);

    return {
      data: result.data.map((location) => this.toResponseDto(location)),
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  async findAll(): Promise<LocationResponseDto[]> {
    const locations = await this.locationRepository.findAll();
    return locations.map((location) => this.toResponseDto(location));
  }

  async findOne(id: string): Promise<LocationResponseDto> {
    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return this.toResponseDto(location);
  }

  async create(
    createLocationDto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.locationRepository.create({
      name: createLocationDto.name,
      type: createLocationDto.type,
      address: createLocationDto.address ?? '',
      contact_person: createLocationDto.contact_person ?? '',
      phone: createLocationDto.phone ?? '',
      is_active: createLocationDto.is_active ?? true,
    });

    return this.toResponseDto(location);
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.getLocationOrFail(id);

    if (Object.keys(updateLocationDto).length === 0) {
      return this.toResponseDto(location);
    }

    await this.locationRepository.update(id, updateLocationDto);

    const updated = await this.locationRepository.findById(id);
    return this.toResponseDto(updated!);
  }

  async delete(id: string): Promise<void> {
    await this.getLocationOrFail(id);
    await this.locationRepository.delete(id);
  }

  async existsById(id: string): Promise<boolean> {
    return this.locationRepository.existsById(id);
  }

  private async getLocationOrFail(id: string): Promise<Location> {
    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  private toResponseDto(location: Location): LocationResponseDto {
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      address: location.address,
      contact_person: location.contact_person,
      phone: location.phone,
      is_active: location.is_active,
      created_at: location.created_at,
      updated_at: location.updated_at,
    };
  }
}
