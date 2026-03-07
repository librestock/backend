import { DataSource } from 'typeorm';
import {
  addTransactionalDataSource,
  deleteDataSourceByName,
  initializeTransactionalContext,
} from 'typeorm-transactional';

const TEST_DATASOURCE_NAME = 'default';

export async function setupTransactionalTestContext(): Promise<DataSource> {
  initializeTransactionalContext();

  const dataSource = new DataSource({
    type: 'sqljs',
    autoSave: false,
    synchronize: false,
    entities: [],
  });
  await dataSource.initialize();

  addTransactionalDataSource({
    name: TEST_DATASOURCE_NAME,
    dataSource,
    patch: false,
  });

  return dataSource;
}

export async function teardownTransactionalTestContext(
  dataSource: DataSource | null,
): Promise<void> {
  deleteDataSourceByName(TEST_DATASOURCE_NAME);
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
}
