import { config } from 'dotenv';
import { clearDatabase, createDatabase } from './seed/config';
import { registry } from './seed/registry';

// Import seeders — each file self-registers via registry.register()
import './seed/categories';
import './seed/suppliers';
import './seed/products';
import './seed/locations';
import './seed/clients';
import './seed/inventory';
import './seed/orders';
import './seed/stock-movements';
import './seed/audit-logs';

config();

async function main() {
  console.log('Starting database seed...\n');

  const db = await createDatabase();
  console.log('Database connected\n');

  try {
    await clearDatabase(db);

    await registry.runAll({
      db,
      store: new Map(),
    });

    console.log('Database seeding completed!\n');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    const pool = (db as any)._.session?.client;
    if (pool?.end) {
      await pool.end();
      console.log('Database connection closed');
    }
  }
}

void main();
