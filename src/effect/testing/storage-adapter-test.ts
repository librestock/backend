/**
 * In-memory StorageAdapter stub (forward-looking for LIB-176).
 *
 * ## Why this exists
 *
 * Today, `PhotosService` calls `fs/promises.writeFile` and `fs/promises.unlink`
 * inline:
 *
 *   backend/src/effect/modules/photos/service.ts:140 — writeFile(...)
 *   backend/src/effect/modules/photos/service.ts:224 — unlink(...)
 *
 * That makes the photos module hard to unit-test (tests have to pick a
 * temp dir, race on filesystem cleanup, and emit real I/O). It also
 * blocks the LIB-176 swap to object storage (S3, R2, etc.).
 *
 * ## What this module defines
 *
 * A minimal `StorageAdapter` interface and an `InMemoryStorageAdapter`
 * implementation backed by a `Map<string, Buffer>`. Tests can:
 *
 *   1. Provide `Layer.succeed(StorageAdapter, makeInMemoryStorageAdapter())`
 *   2. Assert on `adapter.store.has(path)` / `adapter.store.get(path)`
 *      after an effect runs.
 *
 * ## Proposed (NOT applied here) refactor path for `PhotosService`
 *
 *   1. Add `StorageAdapter` as a `dependencies:` entry on
 *      `PhotosService` (mirroring `PhotosRepository`).
 *   2. Replace the `writeFile(storagePath, file.buffer)` call at
 *      service.ts:140 with `yield* storage.write(storagePath, file.buffer)`.
 *   3. Replace `unlink(storagePath)` inside `safeUnlink` at service.ts:224
 *      with `yield* storage.delete(storagePath)`.
 *   4. Add a production `NodeFsStorageAdapter` Layer under
 *      `src/effect/platform/storage.ts` that keeps the current fs behavior.
 *   5. Wire it into `platformLayer` in `main.ts`.
 *
 * That refactor is Wave 1+ work — this file is only the test shim.
 */
import { Context, Effect, Layer } from 'effect';

/**
 * The forward-looking interface the photos module should adopt. Kept
 * intentionally narrow — it should cover the filesystem calls photos
 * makes today, and nothing else. Grow it deliberately.
 */
export interface StorageAdapter {
  /** Write `data` to `path`. Creates parent directories as needed. */
  readonly write: (
    path: string,
    data: Buffer,
  ) => Effect.Effect<void, StorageError>;

  /**
   * Delete the object at `path`. Succeeds silently if it doesn't exist
   * (parity with `PhotosService.safeUnlink`).
   */
  readonly delete: (path: string) => Effect.Effect<void, StorageError>;

  /** Check whether an object exists at `path`. */
  readonly exists: (path: string) => Effect.Effect<boolean, StorageError>;

  /**
   * Read the bytes at `path`.
   * Fails with `StorageError` whose `cause` is `StorageNotFound` if missing.
   */
  readonly read: (path: string) => Effect.Effect<Buffer, StorageError>;
}

export class StorageError extends Error {
  readonly _tag = 'StorageError' as const;
  constructor(
    readonly action: string,
    readonly path: string,
    readonly cause?: unknown,
  ) {
    super(`StorageAdapter.${action} failed for "${path}"`);
  }
}

export class StorageNotFound extends Error {
  readonly _tag = 'StorageNotFound' as const;
  constructor(readonly path: string) {
    super(`StorageAdapter: no object at "${path}"`);
  }
}

/**
 * The Effect Context tag. Downstream production code should define this
 * in `src/effect/platform/storage.ts` once the refactor lands; for now,
 * tests can import it from here and the production app doesn't reference
 * it at all.
 */
export const StorageAdapterTag = Context.GenericTag<StorageAdapter>(
  '@librestock/effect/platform/StorageAdapter',
);

export interface InMemoryStorageAdapter extends StorageAdapter {
  /** Exposed for test assertions. Key: path, Value: bytes. */
  readonly store: Map<string, Buffer>;
  /** Clear all stored objects between tests. */
  readonly reset: () => void;
}

/**
 * Build an in-memory adapter. The returned `store` map is the source of
 * truth — tests can inspect it directly.
 *
 * @example
 *   const storage = makeInMemoryStorageAdapter();
 *   const layer = Layer.succeed(StorageAdapterTag, storage);
 *   // ... run the effect ...
 *   expect(storage.store.has('/uploads/photos/x.jpg')).toBe(true);
 */
export function makeInMemoryStorageAdapter(
  seed: Record<string, Buffer> = {},
): InMemoryStorageAdapter {
  const store = new Map<string, Buffer>(Object.entries(seed));

  const write = (path: string, data: Buffer) =>
    Effect.sync(() => {
      store.set(path, Buffer.from(data));
    });

  const deleteAt = (path: string) =>
    Effect.sync(() => {
      store.delete(path);
    });

  const exists = (path: string) => Effect.sync(() => store.has(path));

  const read = (path: string): Effect.Effect<Buffer, StorageError> => {
    const bytes = store.get(path);
    return bytes
      ? Effect.succeed(bytes)
      : Effect.fail(
          new StorageError('read', path, new StorageNotFound(path)),
        );
  };

  return {
    store,
    reset: () => store.clear(),
    write,
    delete: deleteAt,
    exists,
    read,
  };
}

/**
 * Layer convenience. Returns the adapter alongside the layer so tests
 * can still assert on the internal `store`.
 */
export function makeInMemoryStorageAdapterLayer(
  seed: Record<string, Buffer> = {},
): {
  layer: Layer.Layer<StorageAdapter>;
  adapter: InMemoryStorageAdapter;
} {
  const adapter = makeInMemoryStorageAdapter(seed);
  return {
    adapter,
    layer: Layer.succeed(StorageAdapterTag, adapter),
  };
}
