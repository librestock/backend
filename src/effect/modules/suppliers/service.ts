import { Effect } from 'effect';
import type { Schema } from 'effect';
import type { SupplierQueryDto } from '@librestock/types/suppliers';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import type { suppliers } from '../../platform/db/schema';
import type {
  CreateSupplierSchema,
  UpdateSupplierSchema,
} from './suppliers.schema';
import { toSupplierResponseDto } from './suppliers.utils';
import {
  SupplierNotFound,
  type SuppliersInfrastructureError,
} from './suppliers.errors';
import { SuppliersRepository } from './repository';

type Supplier = typeof suppliers.$inferSelect;

type CreateSupplierDto = Schema.Schema.Type<typeof CreateSupplierSchema>;
type UpdateSupplierDto = Schema.Schema.Type<typeof UpdateSupplierSchema>;

export class SuppliersService extends Effect.Service<SuppliersService>()(
  '@librestock/effect/SuppliersService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* SuppliersRepository;

      const getSupplierOrFail = (
        id: string,
      ): Effect.Effect<Supplier, SupplierNotFound | SuppliersInfrastructureError> =>
        Effect.flatMap(repository.findById(id), (supplier) =>
          supplier
            ? Effect.succeed(supplier)
            : Effect.fail(new SupplierNotFound({ id, message: 'Supplier not found' })),
        );

      const findAllPaginated = (query: SupplierQueryDto) =>
        Effect.map(
          repository.findAllPaginated(query),
          (result) => toPaginatedResponse(result, toSupplierResponseDto),
        );

      const findOne = (id: string) =>
        Effect.map(getSupplierOrFail(id), toSupplierResponseDto);

      const create = (dto: CreateSupplierDto) =>
        Effect.map(
          repository.create({
            name: dto.name,
            contact_person: dto.contact_person ?? null,
            email: dto.email ?? null,
            phone: dto.phone ?? null,
            address: dto.address ?? null,
            website: dto.website ?? null,
            notes: dto.notes ?? null,
            is_active: dto.is_active ?? true,
          }),
          toSupplierResponseDto,
        );

      const update = (id: string, dto: UpdateSupplierDto) =>
        Effect.gen(function* () {
          const supplier = yield* getSupplierOrFail(id);

          if (Object.keys(dto).length === 0) {
            return toSupplierResponseDto(supplier);
          }

          yield* repository.update(id, dto);

          const updated = yield* getSupplierOrFail(id);
          return toSupplierResponseDto(updated);
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          yield* getSupplierOrFail(id);
          yield* repository.delete(id);
        });

      const existsById = (id: string) => repository.existsById(id);

      return { findAllPaginated, findOne, create, update, delete: remove, existsById };
    }),
    dependencies: [SuppliersRepository.Default],
  },
) {}
