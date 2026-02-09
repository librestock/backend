import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientStatus } from '@librestock/types';
import { ClientsService } from './clients.service';
import { ClientRepository, type PaginatedResult } from './client.repository';
import { type Client } from './entities/client.entity';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientRepository: jest.Mocked<ClientRepository>;

  const mockClient: Client = {
    id: 'client-001',
    company_name: 'Acme Corp',
    contact_person: 'John Doe',
    email: 'john@acmecorp.com',
    yacht_name: 'Sea Breeze',
    phone: '+1-555-1234',
    billing_address: '123 Main St',
    default_delivery_address: '456 Harbor Dr',
    account_status: ClientStatus.ACTIVE,
    payment_terms: 'Net 30',
    credit_limit: 50000,
    notes: 'VIP client',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockClientRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      existsById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: ClientRepository, useValue: mockClientRepository },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientRepository = module.get(ClientRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated clients', async () => {
      const paginatedResult: PaginatedResult<Client> = {
        data: [mockClient],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      clientRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.has_next).toBe(false);
      expect(result.meta.has_previous).toBe(false);
    });

    it('should handle pagination metadata correctly', async () => {
      const paginatedResult: PaginatedResult<Client> = {
        data: [mockClient],
        total: 50,
        page: 2,
        limit: 20,
        total_pages: 3,
      };
      clientRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 2,
        limit: 20,
      });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a client by id', async () => {
      clientRepository.findById.mockResolvedValue(mockClient);

      const result = await service.findOne('client-001');

      expect(result.id).toBe('client-001');
      expect(result.company_name).toBe('Acme Corp');
      expect(result.email).toBe('john@acmecorp.com');
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Client not found',
      );
    });
  });

  describe('create', () => {
    const createDto = {
      company_name: 'Acme Corp',
      contact_person: 'John Doe',
      email: 'john@acmecorp.com',
    };

    it('should create a client successfully', async () => {
      clientRepository.findByEmail.mockResolvedValue(null);
      clientRepository.create.mockResolvedValue(mockClient);

      const result = await service.create(createDto);

      expect(result.company_name).toBe('Acme Corp');
      expect(result.email).toBe('john@acmecorp.com');
    });

    it('should create a client with optional fields', async () => {
      const createDtoWithOptional = {
        ...createDto,
        yacht_name: 'Sea Breeze',
        phone: '+1-555-1234',
        billing_address: '123 Main St',
        account_status: ClientStatus.ACTIVE,
        credit_limit: 50000,
      };
      clientRepository.findByEmail.mockResolvedValue(null);
      clientRepository.create.mockResolvedValue(mockClient);

      const result = await service.create(createDtoWithOptional);

      expect(result.yacht_name).toBe('Sea Breeze');
      expect(clientRepository.create).toHaveBeenCalledWith({
        company_name: 'Acme Corp',
        contact_person: 'John Doe',
        email: 'john@acmecorp.com',
        yacht_name: 'Sea Breeze',
        phone: '+1-555-1234',
        billing_address: '123 Main St',
        default_delivery_address: null,
        account_status: ClientStatus.ACTIVE,
        payment_terms: null,
        credit_limit: 50000,
        notes: null,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      clientRepository.findByEmail.mockResolvedValue(mockClient);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'A client with this email already exists',
      );
    });
  });

  describe('update', () => {
    it('should update client successfully', async () => {
      const updateDto = { company_name: 'Updated Corp' };
      const updatedClient = { ...mockClient, company_name: 'Updated Corp' };
      clientRepository.findById
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(updatedClient);
      clientRepository.update.mockResolvedValue(1);

      const result = await service.update('client-001', updateDto);

      expect(result.company_name).toBe('Updated Corp');
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { company_name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing client when no changes provided', async () => {
      clientRepository.findById.mockResolvedValue(mockClient);

      const result = await service.update('client-001', {});

      expect(clientRepository.update).not.toHaveBeenCalled();
      expect(result.id).toBe('client-001');
    });

    it('should check email uniqueness when changing email', async () => {
      const updateDto = { email: 'existing@other.com' };
      clientRepository.findById.mockResolvedValue(mockClient);
      clientRepository.findByEmail.mockResolvedValue({
        ...mockClient,
        id: 'client-002',
        email: 'existing@other.com',
      });

      await expect(
        service.update('client-001', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating email to same value', async () => {
      const updateDto = { email: 'john@acmecorp.com' };
      clientRepository.findById
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockClient);
      clientRepository.update.mockResolvedValue(1);

      const result = await service.update('client-001', updateDto);

      expect(clientRepository.findByEmail).not.toHaveBeenCalled();
      expect(result.id).toBe('client-001');
    });
  });

  describe('delete', () => {
    it('should delete a client', async () => {
      clientRepository.findById.mockResolvedValue(mockClient);
      clientRepository.delete.mockResolvedValue(undefined);

      await service.delete('client-001');

      expect(clientRepository.delete).toHaveBeenCalledWith('client-001');
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete('non-existent-id')).rejects.toThrow(
        'Client not found',
      );
    });
  });

  describe('existsById', () => {
    it('should return true when client exists', async () => {
      clientRepository.existsById.mockResolvedValue(true);

      const result = await service.existsById('client-001');

      expect(result).toBe(true);
    });

    it('should return false when client does not exist', async () => {
      clientRepository.existsById.mockResolvedValue(false);

      const result = await service.existsById('non-existent-id');

      expect(result).toBe(false);
    });
  });
});
