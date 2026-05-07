import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export interface CommittedSqlMigration {
  readonly name: string;
  readonly sql: string;
}

export const getCommittedSqlMigrations = (
  migrationsDir = path.resolve(process.cwd(), 'drizzle'),
): ReadonlyArray<CommittedSqlMigration> => {
  if (!existsSync(migrationsDir)) {
    return [];
  }

  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => ({
      name: fileName,
      sql: readFileSync(path.join(migrationsDir, fileName), 'utf8'),
    }));
};
