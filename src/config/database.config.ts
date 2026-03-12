import { registerAs } from '@nestjs/config';
import { type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { makeNestTypeOrmOptions } from './typeorm-options';

export default registerAs('database', (): TypeOrmModuleOptions => {
  return makeNestTypeOrmOptions();
});
