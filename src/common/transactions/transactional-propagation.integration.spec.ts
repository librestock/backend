import { Injectable } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule, InjectRepository, getRepositoryToken } from '@nestjs/typeorm';
import { type Repository, DataSource, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import {
  addTransactionalDataSource,
  initializeTransactionalContext,
} from 'typeorm-transactional';
import { Transactional } from '../decorators/transactional.decorator';

@Entity('tx_probe')
class TxProbeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;
}

@Injectable()
class NestedWriteService {
  constructor(
    @InjectRepository(TxProbeEntity)
    private readonly repository: Repository<TxProbeEntity>,
  ) {}

  async create(name: string): Promise<void> {
    await this.repository.save({ name });
  }
}

@Injectable()
class TransactionProbeService {
  constructor(
    @InjectRepository(TxProbeEntity)
    private readonly repository: Repository<TxProbeEntity>,
    private readonly nestedWriteService: NestedWriteService,
  ) {}

  @Transactional()
  async createTwoAndThrow(): Promise<void> {
    await this.repository.save({ name: 'first-write' });
    await this.repository.save({ name: 'second-write' });
    throw new Error('force-rollback');
  }

  @Transactional()
  async createNestedAndThrow(): Promise<void> {
    await this.repository.save({ name: 'parent-write' });
    await this.nestedWriteService.create('child-write');
    throw new Error('force-rollback');
  }

  @Transactional()
  async createNestedAndCommit(): Promise<void> {
    await this.repository.save({ name: 'parent-commit' });
    await this.nestedWriteService.create('child-commit');
  }
}

describe('Transactional propagation integration', () => {
  let module: TestingModule;
  let service: TransactionProbeService;
  let repository: Repository<TxProbeEntity>;

  jest.setTimeout(20000);

  beforeAll(async () => {
    initializeTransactionalContext();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqljs',
          autoSave: false,
          synchronize: true,
          retryAttempts: 1,
          retryDelay: 0,
          entities: [TxProbeEntity],
        }),
        TypeOrmModule.forFeature([TxProbeEntity]),
      ],
      providers: [NestedWriteService, TransactionProbeService],
    }).compile();

    const dataSource = module.get(DataSource);
    addTransactionalDataSource(dataSource);

    service = module.get(TransactionProbeService);
    repository = module.get(getRepositoryToken(TxProbeEntity));
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await repository.clear();
  });

  it('rolls back all writes when a transactional method throws', async () => {
    await expect(service.createTwoAndThrow()).rejects.toThrow('force-rollback');
    expect(await repository.count()).toBe(0);
  });

  it('rolls back nested service writes as a single transactional unit', async () => {
    await expect(service.createNestedAndThrow()).rejects.toThrow('force-rollback');
    expect(await repository.count()).toBe(0);
  });

  it('commits nested writes when no error is thrown', async () => {
    await service.createNestedAndCommit();
    expect(await repository.count()).toBe(2);
  });
});
