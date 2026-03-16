import { Effect } from 'effect';
import type { Schema } from 'effect';
import type { ClientResponseDto } from '@librestock/types/clients';
import type {
  ClientQuerySchema,
  CreateClientSchema,
  UpdateClientSchema,
} from './clients.schema';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import { toClientResponseDto } from './clients.utils';
import {
  ClientEmailAlreadyExists,
  ClientNotFound,
  ClientsInfrastructureError,
} from './clients.errors';
import type { Client } from './entities/client.entity';
import { ClientsRepository } from './repository';

type ClientQueryDto = Schema.Schema.Type<typeof ClientQuerySchema>;
type CreateClientDto = Schema.Schema.Type<typeof CreateClientSchema>;
type UpdateClientDto = Schema.Schema.Type<typeof UpdateClientSchema>;

export class ClientsService extends Effect.Service<ClientsService>()(
  '@librestock/effect/ClientsService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* ClientsRepository;

      const getClientOrFail = (
        id: string,
      ): Effect.Effect<Client, ClientNotFound | ClientsInfrastructureError> =>
        Effect.flatMap(repository.findById(id), (client) =>
          client
            ? Effect.succeed(client)
            : Effect.fail(new ClientNotFound({ id, message: 'Client not found' })),
        );

      const findAllPaginated = (
        query: ClientQueryDto,
      ): Effect.Effect<
        { data: ClientResponseDto[]; meta: any },
        ClientsInfrastructureError
      > =>
        Effect.map(repository.findAllPaginated(query), (result) =>
          toPaginatedResponse(result, toClientResponseDto),
        );

      const findOne = (
        id: string,
      ): Effect.Effect<ClientResponseDto, ClientNotFound | ClientsInfrastructureError> =>
        Effect.map(getClientOrFail(id), toClientResponseDto);

      const create = (
        dto: CreateClientDto,
      ): Effect.Effect<
        ClientResponseDto,
        ClientEmailAlreadyExists | ClientsInfrastructureError
      > =>
        Effect.gen(function* () {
          const existing = yield* repository.findByEmail(dto.email);
          if (existing) {
            return yield* Effect.fail(
              new ClientEmailAlreadyExists({
                email: dto.email,
                message: 'A client with this email already exists',
              }),
            );
          }

          const client = yield* repository.create({
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
          });

          return toClientResponseDto(client);
        });

      const update = (
        id: string,
        dto: UpdateClientDto,
      ): Effect.Effect<
        ClientResponseDto,
        ClientEmailAlreadyExists | ClientNotFound | ClientsInfrastructureError
      > =>
        Effect.gen(function* () {
          const client = yield* getClientOrFail(id);

          if (Object.keys(dto).length === 0) {
            return toClientResponseDto(client);
          }

          if (dto.email && dto.email !== client.email) {
            const existing = yield* repository.findByEmail(dto.email!);
            if (existing) {
              return yield* Effect.fail(
                new ClientEmailAlreadyExists({
                  email: dto.email,
                  message: 'A client with this email already exists',
                }),
              );
            }
          }

          yield* repository.update(id, dto);

          const updated = yield* getClientOrFail(id);
          return toClientResponseDto(updated);
        });

      const remove = (
        id: string,
      ): Effect.Effect<void, ClientNotFound | ClientsInfrastructureError> =>
        Effect.gen(function* () {
          yield* getClientOrFail(id);
          yield* repository.delete(id);
        });

      const existsById = (id: string) => repository.existsById(id);

      return { findAllPaginated, findOne, create, update, delete: remove, existsById };
    }),
    dependencies: [ClientsRepository.Default],
  },
) {}
