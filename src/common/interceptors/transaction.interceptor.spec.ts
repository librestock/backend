import { Test, type TestingModule } from '@nestjs/testing';
import { type CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { of, throwError, lastValueFrom } from 'rxjs';
import {
  type MockRequest,
  createExecutionContext,
} from '../../test-utils/execution-context';
import { TRANSACTIONAL_KEY } from '../decorators/transactional.decorator';
import { TransactionInterceptor } from './transaction.interceptor';

describe('TransactionInterceptor', () => {
  let interceptor: TransactionInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let dataSource: jest.Mocked<DataSource>;

  const mockRequest: MockRequest = {
    params: { id: 'entity-123' },
    body: {},
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    session: { user: { id: 'user_123' } },
  };

  const mockExecutionContext = createExecutionContext(mockRequest);

  const mockCallHandler: CallHandler = {
    handle: jest.fn().mockReturnValue(of({ id: 'response-id', name: 'Test' })),
  };

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    interceptor = module.get<TransactionInterceptor>(TransactionInterceptor);
    reflector = module.get(Reflector);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should pass through when method is not transactional', async () => {
      reflector.get.mockReturnValue(undefined);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 'response-id', name: 'Test' });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should wrap handler in transaction when method is transactional', async () => {
      reflector.get.mockReturnValue(true);
      (dataSource.transaction as jest.Mock).mockImplementation(
        (cb: (em: unknown) => unknown) => cb({}),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 'response-id', name: 'Test' });
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      reflector.get.mockReturnValue(true);
      const errorCallHandler: CallHandler = {
        handle: jest
          .fn()
          .mockReturnValue(throwError(() => new Error('DB error'))),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (cb: (em: unknown) => unknown) => cb({}),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        errorCallHandler,
      );

      await expect(lastValueFrom(result$)).rejects.toThrow('DB error');
    });

    it('should check reflector with TRANSACTIONAL_KEY', () => {
      reflector.get.mockReturnValue(undefined);

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(reflector.get).toHaveBeenCalledWith(
        TRANSACTIONAL_KEY,
        expect.any(Function),
      );
    });

    it('should not wrap in transaction when isTransactional is false', async () => {
      reflector.get.mockReturnValue(false);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 'response-id', name: 'Test' });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
