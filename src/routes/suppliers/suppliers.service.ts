import { Injectable, NotFoundException } from '@nestjs/common';
import { toPaginatedResponse } from '../../common/utils/pagination.utils';
import { Supplier } from './entities/supplier.entity';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  SupplierResponseDto,
  PaginatedSuppliersResponseDto,
} from './dto';
import { SupplierRepository } from './suppliers.repository';
import { toSupplierResponseDto } from './suppliers.utils';

@Injectable()
export class SuppliersService {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async findAllPaginated(
    query: SupplierQueryDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    const result = await this.supplierRepository.findAllPaginated(query);

    return toPaginatedResponse(result, toSupplierResponseDto);
  }

  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return toSupplierResponseDto(supplier);
  }

  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.create({
      name: createSupplierDto.name,
      contact_person: createSupplierDto.contact_person ?? null,
      email: createSupplierDto.email ?? null,
      phone: createSupplierDto.phone ?? null,
      address: createSupplierDto.address ?? null,
      website: createSupplierDto.website ?? null,
      notes: createSupplierDto.notes ?? null,
      is_active: createSupplierDto.is_active ?? true,
    });

    return toSupplierResponseDto(supplier);
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.getSupplierOrFail(id);

    if (Object.keys(updateSupplierDto).length === 0) {
      return toSupplierResponseDto(supplier);
    }

    await this.supplierRepository.update(id, updateSupplierDto);

    const updated = await this.supplierRepository.findById(id);
    return toSupplierResponseDto(updated!);
  }

  async delete(id: string): Promise<void> {
    await this.getSupplierOrFail(id);
    await this.supplierRepository.delete(id);
  }

  async existsById(id: string): Promise<boolean> {
    return this.supplierRepository.existsById(id);
  }

  private async getSupplierOrFail(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }
}
