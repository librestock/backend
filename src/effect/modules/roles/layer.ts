import { Layer } from 'effect';
import { RolesRepository, makeRolesRepository } from './repository';
import { RolesService, makeRolesService } from './service';

export const rolesRepositoryLayer = Layer.effect(RolesRepository, makeRolesRepository);

export const rolesLayer = Layer.effect(RolesService, makeRolesService).pipe(
  Layer.provide(rolesRepositoryLayer),
);
