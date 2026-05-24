import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createBulkResultBuilder,
  findDuplicates,
  partitionByExistence,
} from './bulk-operation.utils';

type BuilderOperation =
  | { readonly type: 'success'; readonly id: string }
  | {
      readonly type: 'failure';
      readonly id: string | undefined;
      readonly sku: string | undefined;
      readonly error: string;
    };

const builderOperationArbitrary: fc.Arbitrary<BuilderOperation> = fc.oneof(
  fc.record({ type: fc.constant('success' as const), id: fc.string() }),
  fc.record({
    type: fc.constant('failure' as const),
    id: fc.option(fc.string(), { nil: undefined }),
    sku: fc.option(fc.string(), { nil: undefined }),
    error: fc.string(),
  }),
);

describe('bulk operation utility properties', () => {
  it('findDuplicates returns each repeated value once when the duplicate is first observed', () => {
    expect(findDuplicates(['', 'key', 'key', ''])).toEqual(['key', '']);

    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 100 }), (values) => {
        const seen = new Set<string>();
        const recordedDuplicates = new Set<string>();
        const expected: string[] = [];

        for (const value of values) {
          if (seen.has(value)) {
            if (!recordedDuplicates.has(value)) {
              recordedDuplicates.add(value);
              expected.push(value);
            }
            continue;
          }

          seen.add(value);
        }

        expect(findDuplicates(values)).toEqual(expected);
      }),
    );
  });

  it('partitionByExistence preserves order within each partition and accounts for every input', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 100 }),
        fc.array(fc.string(), { maxLength: 100 }),
        (ids, existingValues) => {
          const existingIds = new Set(existingValues);
          const partitioned = partitionByExistence(ids, existingIds);

          expect(partitioned.existing).toEqual(
            ids.filter((id) => existingIds.has(id)),
          );
          expect(partitioned.notFound).toEqual(
            ids.filter((id) => !existingIds.has(id)),
          );
          expect(
            partitioned.existing.length + partitioned.notFound.length,
          ).toBe(ids.length);
        },
      ),
    );
  });

  it('bulk result builder keeps counts aligned with accumulated successes and failures', () => {
    fc.assert(
      fc.property(
        fc.array(builderOperationArbitrary, { maxLength: 100 }),
        (operations) => {
          const builder = createBulkResultBuilder<string>();

          for (const operation of operations) {
            if (operation.type === 'success') {
              builder.addSuccess(operation.id);
            } else {
              builder.addFailure(operation.error, {
                id: operation.id,
                sku: operation.sku,
              });
            }
          }

          const result = builder.build();

          expect(result.success_count).toBe(result.succeeded.length);
          expect(result.failure_count).toBe(result.failures.length);
          expect(result.succeeded).toEqual(
            operations.flatMap((operation) =>
              operation.type === 'success' ? [operation.id] : [],
            ),
          );
          expect(result.failures).toEqual(
            operations.flatMap((operation) => {
              if (operation.type === 'success') return [];
              return [
                {
                  ...(operation.id ? { id: operation.id } : {}),
                  ...(operation.sku ? { sku: operation.sku } : {}),
                  error: operation.error,
                },
              ];
            }),
          );
        },
      ),
    );
  });

  it('bulk result builder preserves failure identifiers and not-found messages', () => {
    const builder = createBulkResultBuilder<string>();

    builder.addFailure('invalid SKU', { id: 'product-1', sku: 'SKU-1' });
    builder.addNotFoundFailures(['missing-1'], 'Product');

    expect(builder.build().failures).toEqual([
      { id: 'product-1', sku: 'SKU-1', error: 'invalid SKU' },
      { id: 'missing-1', error: 'Product not found' },
    ]);

    const defaultEntityBuilder = createBulkResultBuilder<string>();
    defaultEntityBuilder.addNotFoundFailures(['missing-2']);

    expect(defaultEntityBuilder.build().failures).toEqual([
      { id: 'missing-2', error: 'Entity not found' },
    ]);
  });
});
