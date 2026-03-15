import { Layer } from 'effect';
import { ClientsRepository, makeClientsRepository } from './repository';
import { ClientsService, makeClientsService } from './service';

export const clientsRepositoryLayer = Layer.effect(
  ClientsRepository,
  makeClientsRepository,
);

export const clientsLayer = Layer.effect(
  ClientsService,
  makeClientsService,
).pipe(Layer.provide(clientsRepositoryLayer));
