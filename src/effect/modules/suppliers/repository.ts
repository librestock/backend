import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../../common/utils/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Supplier } from '../../../routes/suppliers/entities/supplier.entity';
import type { Schema } from 'effect';
import type { SupplierQuerySchema } from '../../../routes/suppliers/suppliers.schema';

type SupplierQueryDto = Schema.Schema.Type<typeof SupplierQuerySchema>;

const supplierFilterSpec: QuerySpec<Supplier, SupplierQueryDto> = (qb, query) => {
  if (query.q) {
    qb.andWhere('supplier.name ILIKE :search', { search: `%${query.q}%` });
  }
  if (query.is_active !== undefined) {
    qb.andWhere('supplier.is_active = :is_active', { is_active: query.is_active });
  }
};

const supplierSortSpec: QuerySpec<Supplier, SupplierQueryDto> = (qb) => {
  qb.orderBy('supplier.name', 'ASC');
};

export interface SuppliersRepository {
  readonly findAllPaginated: (
    query: SupplierQueryDto,
  ) => Promise<RepositoryPaginatedResult<Supplier>>;
  readonly findById: (id: string) => Promise<Supplier | null>;
  readonly existsById: (id: string) => Promise<boolean>;
  readonly create: (data: Partial<Supplier>) => Promise<Supplier>;
  readonly update: (id: string, data: Partial<Supplier>) => Promise<number>;
  readonly delete: (id: string) => Promise<void>;
}

export const SuppliersRepository = Context.GenericTag<SuppliersRepository>(
  '@librestock/effect/SuppliersRepository',
);

const createSuppliersRepository = (
  repository: Repository<Supplier>,
): SuppliersRepository => ({
  findAllPaginated: async (query) => {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
    const qb = applyQuerySpecs(
      repository.createQueryBuilder('supplier'),
      query,
      [supplierFilterSpec, supplierSortSpec],
    );
    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();
    return toRepositoryPaginatedResult(data, total, page, limit);
  },
  findById: (id) =>
    repository.createQueryBuilder('supplier').where('supplier.id = :id', { id }).getOne(),
  existsById: async (id) => {
    const count = await repository.createQueryBuilder('supplier').where('supplier.id = :id', { id }).getCount();
    return count > 0;
  },
  create: async (data) => {
    const supplier = repository.create(data);
    return repository.save(supplier);
  },
  update: async (id, data) => {
    const result = await repository
      .createQueryBuilder()
      .update(Supplier)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  },
  delete: async (id) => {
    await repository.delete(id);
  },
});

export const makeSuppliersRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;
  return createSuppliersRepository(dataSource.getRepository(Supplier));
});
