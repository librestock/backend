import { Layer } from 'effect';
import { UsersRepository, makeUsersRepository } from './repository';
import { UsersService, makeUsersService } from './service';

export const usersRepositoryLayer = Layer.effect(UsersRepository, makeUsersRepository);

export const usersLayer = Layer.effect(UsersService, makeUsersService).pipe(
  Layer.provide(usersRepositoryLayer),
);
