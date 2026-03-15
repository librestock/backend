import { Context, Effect } from 'effect';
import type { Schema } from 'effect';
import type { ClientResponseDto } from '../../../routes/clients/dto';
import type {
  ClientQuerySchema,
  CreateClientSchema,
  UpdateClientSchema,
} from '../../../routes/clients/clients.schema';
import { toPaginatedResponse } from '../../../common/utils/pagination.utils';
import { clientTryAsync, toClientResponseDto } from '../../../routes/clients/clients.utils';
import {
  ClientEmailAlreadyExists,
  ClientNotFound,
  ClientsInfrastructureError,
} from '../../../routes/clients/clients.errors';
import type { Client } from '../../../routes/clients/entities/client.entity';
import { ClientsRepository } from './repository';

type ClientQueryDto = Schema.Schema.Type<typeof ClientQuerySchema>;
type CreateClientDto = Schema.Schema.Type<typeof CreateClientSchema>;
type UpdateClientDto = Schema.Schema.Type<typeof UpdateClientSchema>;

export interface ClientsService {
  readonly findAllPaginated: (
    query: ClientQueryDto,
  ) => Effect.Effect<
    { data: ClientResponseDto[]; meta: any },
    ClientsInfrastructureError
  >;
  readonly findOne: (
    id: string,
  ) => Effect.Effect<ClientResponseDto, ClientNotFound | ClientsInfrastructureError>;
  readonly create: (
    dto: CreateClientDto,
  ) => Effect.Effect<
    ClientResponseDto,
    ClientEmailAlreadyExists | ClientsInfrastructureError
  >;
  readonly update: (
    id: string,
    dto: UpdateClientDto,
  ) => Effect.Effect<
    ClientResponseDto,
    ClientEmailAlreadyExists | ClientNotFound | ClientsInfrastructureError
  >;
  readonly delete: (
    id: string,
  ) => Effect.Effect<void, ClientNotFound | ClientsInfrastructureError>;
  readonly existsById: (id: string) => Promise<boolean>;
}

export const ClientsService = Context.GenericTag<ClientsService>(
  '@librestock/effect/ClientsService',
);

const getClientOrFail = (
  repository: ClientsRepository,
  id: string,
): Effect.Effect<Client, ClientNotFound | ClientsInfrastructureError> =>
  Effect.flatMap(
    clientTryAsync('load client', () => repository.findById(id)),
    (client) =>
      client
        ? Effect.succeed(client)
        : Effect.fail(new ClientNotFound({ id, message: 'Client not found' })),
  );

export const makeClientsService = Effect.gen(function* () {
  const repository = yield* ClientsRepository;

  return {
    findAllPaginated: (query) =>
      Effect.map(
        clientTryAsync('list clients', () => repository.findAllPaginated(query)),
        (result) => toPaginatedResponse(result, toClientResponseDto),
      ),
    findOne: (id) =>
      Effect.map(getClientOrFail(repository, id), toClientResponseDto),
    create: (dto) =>
      Effect.gen(function* () {
        const existing = yield* clientTryAsync('load client by email', () =>
          repository.findByEmail(dto.email),
        );
        if (existing) {
          return yield* Effect.fail(
            new ClientEmailAlreadyExists({
              email: dto.email,
              message: 'A client with this email already exists',
            }),
          );
        }

        const client = yield* clientTryAsync('create client', () =>
          repository.create({
            company_name: dto.company_name,
            contact_person: dto.contact_person,
            email: dto.email,
            yacht_name: dto.yacht_name ?? null,
            phone: dto.phone ?? null,
            billing_address: dto.billing_address ?? null,
            default_delivery_address: dto.default_delivery_address ?? null,
            account_status: dto.account_status,
            payment_terms: dto.payment_terms ?? null,
            credit_limit: dto.credit_limit ?? null,
            notes: dto.notes ?? null,
          }),
        );

        return toClientResponseDto(client);
      }),
    update: (id, dto) =>
      Effect.gen(function* () {
        const client = yield* getClientOrFail(repository, id);

        if (Object.keys(dto).length === 0) {
          return toClientResponseDto(client);
        }

        if (dto.email && dto.email !== client.email) {
          const existing = yield* clientTryAsync('load client by email', () =>
            repository.findByEmail(dto.email!),
          );
          if (existing) {
            return yield* Effect.fail(
              new ClientEmailAlreadyExists({
                email: dto.email,
                message: 'A client with this email already exists',
              }),
            );
          }
        }

        yield* clientTryAsync('update client', () =>
          repository.update(id, dto),
        );

        const updated = yield* getClientOrFail(repository, id);
        return toClientResponseDto(updated);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        yield* getClientOrFail(repository, id);
        yield* clientTryAsync('delete client', () => repository.delete(id));
      }),
    existsById: (id) => repository.existsById(id),
  } satisfies ClientsService;
});
