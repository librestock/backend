import type { SupplierResponseDto } from './dto';
import type { Supplier } from './entities/supplier.entity';

export function toSupplierResponseDto(
  supplier: Supplier,
): SupplierResponseDto {
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
