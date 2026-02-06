import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { ClientQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class ClientRepository {
  constructor(
    @InjectRepository(Client)
    private readonly repository: Repository<Client>,
  ) {}

  async findAllPaginated(
    query: ClientQueryDto,
  ): Promise<PaginatedResult<Client>> {
    const { page = 1, limit = 20, q, account_status } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('client');

    // Search filter (company_name and email)
    if (q) {
      queryBuilder.andWhere(
        '(client.company_name ILIKE :q OR client.email ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    // Account status filter
    if (account_status) {
      queryBuilder.andWhere('client.account_status = :account_status', {
        account_status,
      });
    }

    // Sorting
    queryBuilder.orderBy('client.company_name', 'ASC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
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
