import { Effect, Layer } from 'effect';
import { ClientsService } from './service';
import { ClientsRepository } from './repository';

const makeClientEntity = (overrides: Record<string, any> = {}) => ({
  id: 'client-1',
  company_name: 'Acme Corp',
  contact_person: 'John Doe',
  email: 'john@acme.com',
  yacht_name: null,
  phone: null,
  billing_address: null,
  default_delivery_address: null,
  account_status: 'ACTIVE',
  payment_terms: null,
  credit_limit: null,
  notes: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...overrides,
});

const makeMockRepository = (
  overrides: Partial<Record<string, jest.Mock>> = {},
) => ({
  findAllPaginated: jest.fn().mockReturnValue(
    Effect.succeed({
      data: [makeClientEntity()],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    }),
  ),
  findById: jest.fn().mockReturnValue(Effect.succeed(makeClientEntity())),
  findByEmail: jest.fn().mockReturnValue(Effect.succeed(null)),
  existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
  create: jest.fn().mockReturnValue(Effect.succeed(makeClientEntity())),
  update: jest.fn().mockReturnValue(Effect.succeed(1)),
  delete: jest.fn().mockReturnValue(Effect.succeed(undefined)),
  ...overrides,
});

const buildService = (repo = makeMockRepository()) =>
  Effect.runPromise(
    ClientsService.pipe(
      Effect.provide(
        ClientsService.DefaultWithoutDependencies.pipe(
          Layer.provide(Layer.succeed(ClientsRepository, repo as any)),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect ClientsService', () => {
  describe('findAllPaginated', () => {
    it('returns paginated clients', async () => {
      const service = await buildService();
      const result = await run(service.findAllPaginated({ page: 1, limit: 20 }));
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, total: 1 });
    });
  });

  describe('findOne', () => {
    it('returns a client', async () => {
      const service = await buildService();
      const result = await run(service.findOne('client-1'));
      expect(result).toMatchObject({ id: 'client-1', company_name: 'Acme Corp' });
    });

    it('fails with ClientNotFound', async () => {
      const repo = makeMockRepository({ findById: jest.fn().mockReturnValue(Effect.succeed(null)) });
      const service = await buildService(repo);
      const error = await fail(service.findOne('missing'));
      expect(error).toMatchObject({ _tag: 'ClientNotFound' });
    });
  });

  describe('create', () => {
    it('creates a client', async () => {
      const service = await buildService();
      const result = await run(
        service.create({
          company_name: 'Acme Corp',
          contact_person: 'John Doe',
          email: 'john@acme.com',
        } as any),
      );
      expect(result).toMatchObject({ id: 'client-1' });
    });

    it('fails when email already exists', async () => {
      const repo = makeMockRepository({
        findByEmail: jest.fn().mockReturnValue(Effect.succeed(makeClientEntity())),
      });
      const service = await buildService(repo);
      const error = await fail(
        service.create({
          company_name: 'X',
          contact_person: 'Y',
          email: 'john@acme.com',
        } as any),
      );
      expect(error).toMatchObject({ _tag: 'ClientEmailAlreadyExists' });
    });
  });

  describe('update', () => {
    it('updates a client', async () => {
      const service = await buildService();
      const result = await run(
        service.update('client-1', { company_name: 'Updated' } as any),
      );
      expect(result).toMatchObject({ id: 'client-1' });
    });

    it('returns current entity on empty update', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      await run(service.update('client-1', {} as any));
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('fails when email changed to existing', async () => {
      const repo = makeMockRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(makeClientEntity({ email: 'old@acme.com' }))),
        findByEmail: jest.fn().mockReturnValue(Effect.succeed(makeClientEntity({ id: 'other' }))),
      });
      const service = await buildService(repo);
      const error = await fail(
        service.update('client-1', { email: 'john@acme.com' } as any),
      );
      expect(error).toMatchObject({ _tag: 'ClientEmailAlreadyExists' });
    });

    it('skips email check when email unchanged', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      await run(service.update('client-1', { email: 'john@acme.com' } as any));
      expect(repo.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a client', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      await run(service.delete('client-1'));
      expect(repo.delete).toHaveBeenCalledWith('client-1');
    });

    it('fails with ClientNotFound', async () => {
      const repo = makeMockRepository({ findById: jest.fn().mockReturnValue(Effect.succeed(null)) });
      const service = await buildService(repo);
      const error = await fail(service.delete('missing'));
      expect(error).toMatchObject({ _tag: 'ClientNotFound' });
    });
  });

  describe('existsById', () => {
    it('delegates to repository', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      const result = await Effect.runPromise(service.existsById('client-1'));
      expect(result).toBe(true);
    });
  });
});
