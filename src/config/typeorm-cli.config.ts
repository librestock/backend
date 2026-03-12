import 'dotenv/config';
import { DataSource } from 'typeorm';
import { makeTypeOrmDataSourceOptions } from './typeorm-options';

const dataSource = new DataSource(makeTypeOrmDataSourceOptions());

export default dataSource;
