import { type DataSource } from 'typeorm';

export interface SeedContext {
  dataSource: DataSource;
  store: Map<string, unknown[]>;
}

export interface Seeder {
  name: string;
  dependencies: string[];
  run(ctx: SeedContext): Promise<void>;
}
