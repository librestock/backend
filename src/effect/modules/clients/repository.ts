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
import { Client } from '../../../routes/clients/entities/client.entity';
import type { Schema } from 'effect';
import type { ClientQuerySchema } from '../../../routes/clients/clients.schema';

type ClientQueryDto = Schema.Schema.Type<typeof ClientQuerySchema>;

const clientFilterSpec: QuerySpec<Client, ClientQueryDto> = (qb, query) => {
  if (query.q) {
    qb.andWhere('(client.company_name ILIKE :q OR client.email ILIKE :q)', {
      q: `%${query.q}%`,
    });
  }
  if (query.account_status) {
    qb.andWhere('client.account_status = :account_status', {
      account_status: query.account_status,
    });
  }
};

const clientSortSpec: QuerySpec<Client, ClientQueryDto> = (qb) => {
  qb.orderBy('client.company_name', 'ASC');
};

export interface ClientsRepository {
  readonly findAllPaginated: (
    query: ClientQueryDto,
  ) => Promise<RepositoryPaginatedResult<Client>>;
  readonly findById: (id: string) => Promise<Client | null>;
  readonly findByEmail: (email: string) => Promise<Client | null>;
  readonly existsById: (id: string) => Promise<boolean>;
  readonly create: (data: Partial<Client>) => Promise<Client>;
  readonly update: (id: string, data: Partial<Client>) => Promise<number>;
  readonly delete: (id: string) => Promise<void>;
}

export const ClientsRepository = Context.GenericTag<ClientsRepository>(
  '@librestock/effect/ClientsRepository',
);

const createClientsRepository = (
  repository: Repository<Client>,
): ClientsRepository => ({
  findAllPaginated: async (query) => {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
    const qb = applyQuerySpecs(
      repository.createQueryBuilder('client'),
      query,
      [clientFilterSpec, clientSortSpec],
    );
    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();
    return toRepositoryPaginatedResult(data, total, page, limit);
  },
  findById: (id) =>
    repository.createQueryBuilder('client').where('client.id = :id', { id }).getOne(),
  findByEmail: (email) =>
    repository.createQueryBuilder('client').where('client.email = :email', { email }).getOne(),
  existsById: async (id) => {
    const count = await repository.createQueryBuilder('client').where('client.id = :id', { id }).getCount();
    return count > 0;
  },
  create: async (data) => {
    const client = repository.create(data);
    return repository.save(client);
  },
  update: async (id, data) => {
    const result = await repository
      .createQueryBuilder()
      .update(Client)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  },
  delete: async (id) => {
    await repository.delete(id);
  },
});

export const makeClientsRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;
  return createClientsRepository(dataSource.getRepository(Client));
});
