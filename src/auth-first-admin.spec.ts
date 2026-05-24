import type { PoolClient } from 'pg';
import {
  ADMIN_ROLE_NAME,
  createFirstAdminAssigner,
  FIRST_ADMIN_LOCK_KEY,
} from './auth-first-admin';
import { DEFAULT_TENANT_ID } from './effect/platform/tenant-constants';

const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';
const ADMIN_ROLE_ID = '00000000-0000-4000-b000-000000000001';

interface QueryRecord {
  readonly text: string;
  readonly params?: unknown[];
}

function makeClient(
  respond: (query: QueryRecord) => unknown | Promise<unknown>,
) {
  const queries: QueryRecord[] = [];
  const client = {
    query: vi.fn(async (text: string, params?: unknown[]) => {
      const query = { text, params };
      queries.push(query);
      return (await respond(query)) ?? { rows: [] };
    }),
    release: vi.fn(),
  };

  return {
    client: client as unknown as PoolClient,
    queries,
    rawClient: client,
  };
}

function makePool(client: PoolClient) {
  return {
    connect: vi.fn(async () => client),
  };
}

const hasSql = (query: QueryRecord, fragment: string) =>
  query.text.replace(/\s+/g, ' ').includes(fragment);

describe('createFirstAdminAssigner', () => {
  it('creates default tenant membership and exits when no Admin role exists', async () => {
    const { client, queries, rawClient } = makeClient((query) => {
      if (hasSql(query, 'SELECT id FROM roles')) return { rows: [] };
      return { rows: [] };
    });
    const pool = makePool(client);

    await createFirstAdminAssigner(pool)(TEST_USER_ID);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(queries[0]).toMatchObject({ text: 'BEGIN' });
    const lockIndex = queries.findIndex((query) =>
      hasSql(query, 'pg_advisory_xact_lock'),
    );
    expect(lockIndex).toBeGreaterThan(-1);
    expect(queries[lockIndex]?.params).toEqual([FIRST_ADMIN_LOCK_KEY]);
    // The lock must be held before any state-mutating query runs, otherwise
    // two racing signups could both decide they are "the first admin".
    const firstWriteIndex = queries.findIndex(
      (query, index) =>
        index > 0 &&
        /^(INSERT|UPDATE|DELETE)\b/i.test(query.text.trimStart()),
    );
    expect(firstWriteIndex).toBeGreaterThan(lockIndex);
    expect(
      queries.some((query) => hasSql(query, 'INSERT INTO "organization"')),
    ).toBe(true);
    expect(queries.some((query) => hasSql(query, 'INSERT INTO "member"'))).toBe(
      true,
    );
    expect(
      queries.some((query) => hasSql(query, 'INSERT INTO user_roles')),
    ).toBe(false);
    expect(queries.some((query) => hasSql(query, 'UPDATE "user"'))).toBe(false);
    expect(queries.at(-1)).toMatchObject({ text: 'COMMIT' });
    expect(rawClient.release).toHaveBeenCalledTimes(1);
  });

  it('assigns Admin and syncs Better Auth role for the first admin user', async () => {
    const { client, queries } = makeClient((query) => {
      if (hasSql(query, 'SELECT id FROM roles')) {
        expect(query.params).toEqual([DEFAULT_TENANT_ID, ADMIN_ROLE_NAME]);
        return { rows: [{ id: ADMIN_ROLE_ID }] };
      }
      if (hasSql(query, 'SELECT 1 FROM user_roles')) return { rows: [] };
      return { rows: [] };
    });

    await createFirstAdminAssigner(makePool(client))(TEST_USER_ID);

    const userRoleInsert = queries.find((query) =>
      hasSql(query, 'INSERT INTO user_roles'),
    );
    expect(userRoleInsert?.params).toEqual([
      DEFAULT_TENANT_ID,
      TEST_USER_ID,
      ADMIN_ROLE_ID,
    ]);
    const authRoleUpdate = queries.find((query) =>
      hasSql(query, 'UPDATE "user" SET role ='),
    );
    expect(authRoleUpdate?.params).toEqual([TEST_USER_ID]);
    expect(queries.at(-1)).toMatchObject({ text: 'COMMIT' });
  });

  it('does not assign Admin when an Admin assignment already exists', async () => {
    const { client, queries } = makeClient((query) => {
      if (hasSql(query, 'SELECT id FROM roles')) {
        return { rows: [{ id: ADMIN_ROLE_ID }] };
      }
      if (hasSql(query, 'SELECT 1 FROM user_roles')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });

    await createFirstAdminAssigner(makePool(client))(TEST_USER_ID);

    expect(
      queries.some((query) => hasSql(query, 'INSERT INTO user_roles')),
    ).toBe(false);
    expect(queries.some((query) => hasSql(query, 'UPDATE "user"'))).toBe(false);
    expect(queries.at(-1)).toMatchObject({ text: 'COMMIT' });
  });

  it('rolls back and releases the client when assignment fails', async () => {
    const cause = new Error('role sync failed');
    const { client, queries, rawClient } = makeClient((query) => {
      if (hasSql(query, 'SELECT id FROM roles')) {
        return { rows: [{ id: ADMIN_ROLE_ID }] };
      }
      if (hasSql(query, 'SELECT 1 FROM user_roles')) return { rows: [] };
      if (hasSql(query, 'UPDATE "user" SET role =')) throw cause;
      return { rows: [] };
    });

    await expect(
      createFirstAdminAssigner(makePool(client))(TEST_USER_ID),
    ).rejects.toBe(cause);

    expect(queries.some((query) => query.text === 'ROLLBACK')).toBe(true);
    expect(queries.some((query) => query.text === 'COMMIT')).toBe(false);
    expect(rawClient.release).toHaveBeenCalledTimes(1);
  });
});
