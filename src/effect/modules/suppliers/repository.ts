import { Effect } from 'effect';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SuppliersInfrastructureError } from './suppliers.errors';
import type { Schema } from 'effect';
import type { SupplierQuerySchema } from './suppliers.schema';

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

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new SuppliersInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class SuppliersRepository extends Effect.Service<SuppliersRepository>()(
  '@librestock/effect/SuppliersRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(Supplier);

      const findAllPaginated = (
        query: SupplierQueryDto,
      ) =>
        tryAsync('list suppliers', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const qb = applyQuerySpecs(
            repo.createQueryBuilder('supplier'),
            query,
            [supplierFilterSpec, supplierSortSpec],
          );
          const total = await qb.getCount();
          const data = await qb.skip(skip).take(limit).getMany();
          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findById = (id: string) =>
        tryAsync('load supplier', () =>
          repo.createQueryBuilder('supplier').where('supplier.id = :id', { id }).getOne(),
        );

      const existsById = (id: string) =>
        tryAsync('check supplier existence', async () => {
          const count = await repo.createQueryBuilder('supplier').where('supplier.id = :id', { id }).getCount();
          return count > 0;
        });

      const create = (data: Partial<Supplier>) =>
        tryAsync('create supplier', async () => {
          const supplier = repo.create(data);
          return repo.save(supplier);
        });

      const update = (id: string, data: Partial<Supplier>) =>
        tryAsync('update supplier', async () => {
          const result = await repo
            .createQueryBuilder()
            .update(Supplier)
            .set(data)
            .where('id = :id', { id })
            .execute();
          return result.affected ?? 0;
        });

      const remove = (id: string) =>
        tryAsync('delete supplier', async () => {
          await repo.delete(id);
        });

      return { findAllPaginated, findById, existsById, create, update, delete: remove };
    }),
  },
) {}
