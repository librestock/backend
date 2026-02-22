import { Injectable, NotFoundException } from '@nestjs/common';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { Supplier } from './entities/supplier.entity';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  SupplierResponseDto,
  PaginatedSuppliersResponseDto,
} from './dto';
import { SupplierRepository } from './suppliers.repository';

@Injectable()
export class SuppliersService {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async findAllPaginated(
    query: SupplierQueryDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    const result = await this.supplierRepository.findAllPaginated(query);

    return {
      data: result.data.map((supplier) => this.toResponseDto(supplier)),
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return this.toResponseDto(supplier);
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

    return this.toResponseDto(supplier);
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.getSupplierOrFail(id);

    if (Object.keys(updateSupplierDto).length === 0) {
      return this.toResponseDto(supplier);
    }

    await this.supplierRepository.update(id, updateSupplierDto);

    const updated = await this.supplierRepository.findById(id);
    return this.toResponseDto(updated!);
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

  private toResponseDto(supplier: Supplier): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      website: supplier.website,
      notes: supplier.notes,
      is_active: supplier.is_active,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    };
  }
}
