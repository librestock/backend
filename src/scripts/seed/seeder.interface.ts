import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface SeedContext {
  db: NodePgDatabase;
  store: Map<string, unknown[]>;
}

export interface Seeder {
  name: string;
  dependencies: string[];
  run(ctx: SeedContext): Promise<void>;
}
