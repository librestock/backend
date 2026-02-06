import { registerAs } from '@nestjs/config';
import { type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { getSSLConfig, getPoolMax, IDLE_TIMEOUT_MS, getDbConnectionParams } from './db-connection.utils';

const ssl = getSSLConfig();
const poolMax = getPoolMax();

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const synchronize = !isProduction && process.env.DB_SYNCHRONIZE === 'true';
  const params = getDbConnectionParams();

  const shared: Partial<TypeOrmModuleOptions> = {
    type: 'postgres',
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
    migrationsRun: isProduction,
    synchronize,
    logging: process.env.NODE_ENV === 'development',
    ssl,
    extra: { max: poolMax, idleTimeoutMillis: IDLE_TIMEOUT_MS },
  };

  if ('url' in params) {
    return { ...shared, url: params.url } as TypeOrmModuleOptions;
  }

  return {
    ...shared,
    host: params.host,
    ...(params.port !== undefined ? { port: params.port } : {}),
    username: params.user,
    password: params.password,
    database: params.database,
  } as TypeOrmModuleOptions;
});
