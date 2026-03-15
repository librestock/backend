import { Data, Context, Effect, Layer } from 'effect';
import { DataSource } from 'typeorm';
import { makeTypeOrmDataSourceOptions } from '../../config/typeorm-options';

export class TypeOrmInitializationError extends Data.TaggedError(
  'TypeOrmInitializationError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const TypeOrmDataSource = Context.GenericTag<DataSource>(
  '@librestock/effect/TypeOrmDataSource',
);

export const typeOrmLayer = Layer.scoped(
  TypeOrmDataSource,
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const dataSource = new DataSource(
          makeTypeOrmDataSourceOptions({
            migrationsRun: process.env.NODE_ENV === 'production',
            synchronize:
              process.env.NODE_ENV !== 'production' &&
              process.env.DB_SYNCHRONIZE === 'true',
            logging: process.env.NODE_ENV === 'development',
          }),
        );

        if (!dataSource.isInitialized) {
          await dataSource.initialize();
        }

        return dataSource;
      },
      catch: (cause) =>
        new TypeOrmInitializationError({
          cause,
          message: 'Failed to initialize TypeORM data source',
        }),
    }),
    (dataSource) =>
      Effect.promise(() =>
        dataSource.isInitialized ? dataSource.destroy() : Promise.resolve(),
      ),
  ),
);
