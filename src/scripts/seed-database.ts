import { config } from 'dotenv';
import { clearDatabase, createDataSource } from './seed/config';
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

  const dataSource = await createDataSource();
  console.log('Database connected\n');

  try {
    await clearDatabase(dataSource);

    await registry.runAll({
      dataSource,
      store: new Map(),
    });

    console.log('Database seeding completed!\n');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

void main();
