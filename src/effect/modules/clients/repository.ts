import { Effect } from 'effect';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Client } from './entities/client.entity';
import { ClientsInfrastructureError } from './clients.errors';
import type { Schema } from 'effect';
import type { ClientQuerySchema } from './clients.schema';

type ClientQueryDto = Schema.Schema.Type<typeof ClientQuerySchema>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ClientsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

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

export class ClientsRepository extends Effect.Service<ClientsRepository>()(
  '@librestock/effect/ClientsRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(Client);

      const findAllPaginated = (
        query: ClientQueryDto,
      ): Effect.Effect<RepositoryPaginatedResult<Client>, ClientsInfrastructureError> =>
        tryAsync('list clients', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const qb = applyQuerySpecs(
            repo.createQueryBuilder('client'),
            query,
            [clientFilterSpec, clientSortSpec],
          );
          const total = await qb.getCount();
          const data = await qb.skip(skip).take(limit).getMany();
          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findById = (id: string) =>
        tryAsync('load client', () =>
          repo.createQueryBuilder('client').where('client.id = :id', { id }).getOne(),
        );

      const findByEmail = (email: string) =>
        tryAsync('load client by email', () =>
          repo.createQueryBuilder('client').where('client.email = :email', { email }).getOne(),
        );

      const existsById = (id: string) =>
        tryAsync('check client existence', async () => {
          const count = await repo
            .createQueryBuilder('client')
            .where('client.id = :id', { id })
            .getCount();
          return count > 0;
        });

      const create = (data: Partial<Client>) =>
        tryAsync('create client', async () => {
          const client = repo.create(data);
          return repo.save(client);
        });

      const update = (id: string, data: Partial<Client>) =>
        tryAsync('update client', async () => {
          const result = await repo
            .createQueryBuilder()
            .update(Client)
            .set(data)
            .where('id = :id', { id })
            .execute();
          return result.affected ?? 0;
        });

      const remove = (id: string) =>
        tryAsync('delete client', async () => {
          await repo.delete(id);
        });

      return { findAllPaginated, findById, findByEmail, existsById, create, update, delete: remove };
    }),
  },
) {}
