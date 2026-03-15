import { Context, Effect } from 'effect';
import type { Schema } from 'effect';
import type { SupplierResponseDto } from '../../../routes/suppliers/dto';
import type {
  SupplierQuerySchema,
  CreateSupplierSchema,
  UpdateSupplierSchema,
} from '../../../routes/suppliers/suppliers.schema';
import { toPaginatedResponse } from '../../../common/utils/pagination.utils';
import { supplierTryAsync, toSupplierResponseDto } from '../../../routes/suppliers/suppliers.utils';
import {
  SupplierNotFound,
  SuppliersInfrastructureError,
} from '../../../routes/suppliers/suppliers.errors';
import type { Supplier } from '../../../routes/suppliers/entities/supplier.entity';
import { SuppliersRepository } from './repository';

type SupplierQueryDto = Schema.Schema.Type<typeof SupplierQuerySchema>;
type CreateSupplierDto = Schema.Schema.Type<typeof CreateSupplierSchema>;
type UpdateSupplierDto = Schema.Schema.Type<typeof UpdateSupplierSchema>;

export interface SuppliersService {
  readonly findAllPaginated: (
    query: SupplierQueryDto,
  ) => Effect.Effect<
    { data: SupplierResponseDto[]; meta: any },
    SuppliersInfrastructureError
  >;
  readonly findOne: (
    id: string,
  ) => Effect.Effect<SupplierResponseDto, SupplierNotFound | SuppliersInfrastructureError>;
  readonly create: (
    dto: CreateSupplierDto,
  ) => Effect.Effect<SupplierResponseDto, SuppliersInfrastructureError>;
  readonly update: (
    id: string,
    dto: UpdateSupplierDto,
  ) => Effect.Effect<
    SupplierResponseDto,
    SupplierNotFound | SuppliersInfrastructureError
  >;
  readonly delete: (
    id: string,
  ) => Effect.Effect<void, SupplierNotFound | SuppliersInfrastructureError>;
  readonly existsById: (id: string) => Promise<boolean>;
}

export const SuppliersService = Context.GenericTag<SuppliersService>(
  '@librestock/effect/SuppliersService',
);

const getSupplierOrFail = (
  repository: SuppliersRepository,
  id: string,
): Effect.Effect<Supplier, SupplierNotFound | SuppliersInfrastructureError> =>
  Effect.flatMap(
    supplierTryAsync('load supplier', () => repository.findById(id)),
    (supplier) =>
      supplier
        ? Effect.succeed(supplier)
        : Effect.fail(new SupplierNotFound({ id, message: 'Supplier not found' })),
  );

export const makeSuppliersService = Effect.gen(function* () {
  const repository = yield* SuppliersRepository;

  return {
    findAllPaginated: (query) =>
      Effect.map(
        supplierTryAsync('list suppliers', () => repository.findAllPaginated(query)),
        (result) => toPaginatedResponse(result, toSupplierResponseDto),
      ),
    findOne: (id) =>
      Effect.map(getSupplierOrFail(repository, id), toSupplierResponseDto),
    create: (dto) =>
      Effect.map(
        supplierTryAsync('create supplier', () =>
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
        ),
        toSupplierResponseDto,
      ),
    update: (id, dto) =>
      Effect.gen(function* () {
        const supplier = yield* getSupplierOrFail(repository, id);

        if (Object.keys(dto).length === 0) {
          return toSupplierResponseDto(supplier);
        }

        yield* supplierTryAsync('update supplier', () =>
          repository.update(id, dto),
        );

        const updated = yield* getSupplierOrFail(repository, id);
        return toSupplierResponseDto(updated);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        yield* getSupplierOrFail(repository, id);
        yield* supplierTryAsync('delete supplier', () => repository.delete(id));
      }),
    existsById: (id) => repository.existsById(id),
  } satisfies SuppliersService;
});
