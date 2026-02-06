import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { Client } from './entities/client.entity';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
  ClientResponseDto,
  PaginatedClientsResponseDto,
} from './dto';
import { ClientRepository } from './client.repository';

@Injectable()
export class ClientsService {
  constructor(private readonly clientRepository: ClientRepository) {}

  async findAllPaginated(
    query: ClientQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    const result = await this.clientRepository.findAllPaginated(query);

    return {
      data: result.data.map((client) => this.toResponseDto(client)),
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return this.toResponseDto(client);
  }

  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    // Check email uniqueness
    const existing = await this.clientRepository.findByEmail(
      createClientDto.email,
    );
    if (existing) {
      throw new ConflictException('A client with this email already exists');
    }

    const client = await this.clientRepository.create({
      company_name: createClientDto.company_name,
      contact_person: createClientDto.contact_person,
      email: createClientDto.email,
      yacht_name: createClientDto.yacht_name ?? null,
      phone: createClientDto.phone ?? null,
      billing_address: createClientDto.billing_address ?? null,
      default_delivery_address:
        createClientDto.default_delivery_address ?? null,
      account_status: createClientDto.account_status,
      payment_terms: createClientDto.payment_terms ?? null,
      credit_limit: createClientDto.credit_limit ?? null,
      notes: createClientDto.notes ?? null,
    });

    return this.toResponseDto(client);
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.getClientOrFail(id);

    if (Object.keys(updateClientDto).length === 0) {
      return this.toResponseDto(client);
    }

    // Check email uniqueness if changing email
    if (updateClientDto.email && updateClientDto.email !== client.email) {
      const existing = await this.clientRepository.findByEmail(
        updateClientDto.email,
      );
      if (existing) {
        throw new ConflictException('A client with this email already exists');
      }
    }

    await this.clientRepository.update(id, updateClientDto);

    const updated = await this.clientRepository.findById(id);
    return this.toResponseDto(updated!);
  }

  async delete(id: string): Promise<void> {
    await this.getClientOrFail(id);
    await this.clientRepository.delete(id);
  }

  async existsById(id: string): Promise<boolean> {
    return this.clientRepository.existsById(id);
  }

  private async getClientOrFail(id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  private toResponseDto(client: Client): ClientResponseDto {
    return {
      id: client.id,
      company_name: client.company_name,
      contact_person: client.contact_person,
      email: client.email,
      yacht_name: client.yacht_name,
      phone: client.phone,
      billing_address: client.billing_address,
      default_delivery_address: client.default_delivery_address,
      account_status: client.account_status,
      payment_terms: client.payment_terms,
      credit_limit: client.credit_limit,
      notes: client.notes,
      created_at: client.created_at,
      updated_at: client.updated_at,
    };
  }
}
