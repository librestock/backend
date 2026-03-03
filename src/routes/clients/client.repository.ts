import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../common/utils/query-spec.utils';
import { Client } from './entities/client.entity';
import { ClientQueryDto } from './dto';

export type PaginatedResult<T> = RepositoryPaginatedResult<T>;

const clientFilterSpec: QuerySpec<Client, ClientQueryDto> = (
  queryBuilder,
  query,
) => {
  if (query.q) {
    queryBuilder.andWhere(
      '(client.company_name ILIKE :q OR client.email ILIKE :q)',
      { q: `%${query.q}%` },
    );
  }

  if (query.account_status) {
    queryBuilder.andWhere('client.account_status = :account_status', {
      account_status: query.account_status,
    });
  }
};

const clientSortSpec: QuerySpec<Client, ClientQueryDto> = (queryBuilder) => {
  queryBuilder.orderBy('client.company_name', 'ASC');
};

@Injectable()
export class ClientRepository {
  constructor(
    @InjectRepository(Client)
    private readonly repository: Repository<Client>,
  ) {}

  async findAllPaginated(
    query: ClientQueryDto,
  ): Promise<PaginatedResult<Client>> {
    const { page, limit, skip } = resolvePaginationWindow(
      query.page,
      query.limit,
    );

    const queryBuilder = applyQuerySpecs(
      this.repository.createQueryBuilder('client'),
      query,
      [clientFilterSpec, clientSortSpec],
    );

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  }

  async findById(id: string): Promise<Client | null> {
    return this.repository
      .createQueryBuilder('client')
      .where('client.id = :id', { id })
      .getOne();
  }

  async findByEmail(email: string): Promise<Client | null> {
    return this.repository
      .createQueryBuilder('client')
      .where('client.email = :email', { email })
      .getOne();
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('client')
      .where('client.id = :id', { id })
      .getCount();
    return count > 0;
  }

  async create(createData: Partial<Client>): Promise<Client> {
    const client = this.repository.create(createData);
    return this.repository.save(client);
  }

  async update(id: string, updateData: Partial<Client>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Client)
      .set(updateData)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
