import { Layer } from 'effect';
import { SuppliersRepository, makeSuppliersRepository } from './repository';
import { SuppliersService, makeSuppliersService } from './service';

export const suppliersRepositoryLayer = Layer.effect(
  SuppliersRepository,
  makeSuppliersRepository,
);

export const suppliersLayer = Layer.effect(
  SuppliersService,
  makeSuppliersService,
).pipe(Layer.provide(suppliersRepositoryLayer));
