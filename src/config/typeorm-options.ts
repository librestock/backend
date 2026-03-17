import { type DataSourceOptions } from 'typeorm';
import {
  getSSLConfig,
  getPoolMax,
  IDLE_TIMEOUT_MS,
  getDbConnectionParams,
} from './db-connection.utils';

function getSharedTypeOrmOptions(): Partial<DataSourceOptions> {
  const ssl = getSSLConfig();
  const poolMax = getPoolMax();

  return {
    type: 'postgres',
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
    ssl,
    extra: { max: poolMax, idleTimeoutMillis: IDLE_TIMEOUT_MS },
  };
}

export function makeTypeOrmDataSourceOptions(
  overrides: Partial<DataSourceOptions> = {},
): DataSourceOptions {
  const params = getDbConnectionParams();
  const shared = getSharedTypeOrmOptions();

  if ('url' in params) {
    return {
      ...shared,
      ...overrides,
      url: params.url,
    } as DataSourceOptions;
  }

  return {
    ...shared,
    ...overrides,
    host: params.host,
    ...(params.port !== undefined ? { port: params.port } : {}),
    username: params.user,
    password: params.password,
    database: params.database,
  } as DataSourceOptions;
}