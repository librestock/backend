import { Effect } from 'effect';
import type { SupplierResponseDto } from './dto';
import type { Supplier } from './entities/supplier.entity';
import { SuppliersInfrastructureError } from './suppliers.errors';

export const supplierTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new SuppliersInfrastructureError({
        action,
        cause,
        message: `Suppliers service failed to ${action}`,
      }),
  });

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
