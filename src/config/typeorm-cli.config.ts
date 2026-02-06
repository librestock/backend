import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getSSLConfig, getPoolMax, IDLE_TIMEOUT_MS, getDbConnectionParams } from './db-connection.utils';

const ssl = getSSLConfig();
const poolMax = getPoolMax();
const params = getDbConnectionParams();

const shared = {
  type: 'postgres' as const,
  entities: ['src/routes/**/entities/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  ssl,
  extra: { max: poolMax, idleTimeoutMillis: IDLE_TIMEOUT_MS },
};

const dataSource =
  'url' in params
    ? new DataSource({ ...shared, url: params.url })
    : new DataSource({
        ...shared,
        host: params.host,
        ...(params.port !== undefined ? { port: params.port } : {}),
        username: params.user,
        password: params.password,
        database: params.database,
      });

export default dataSource;
