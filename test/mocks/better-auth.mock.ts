interface BetterAuthApi {
  listUsers: (...args: unknown[]) => Promise<{ users: unknown[]; total: number }>;
  banUser: (...args: unknown[]) => Promise<void>;
  unbanUser: (...args: unknown[]) => Promise<void>;
  removeUser: (...args: unknown[]) => Promise<void>;
  revokeUserSessions: (...args: unknown[]) => Promise<void>;
}

export function betterAuth(_options: unknown): {
  $context: Promise<{ runMigrations: () => Promise<void> }>;
  api: BetterAuthApi;
} {
  return {
    $context: Promise.resolve({
      runMigrations: () => Promise.resolve(),
    }),
    api: {
      listUsers: () => Promise.resolve({ users: [], total: 0 }),
      banUser: () => Promise.resolve(),
      unbanUser: () => Promise.resolve(),
      removeUser: () => Promise.resolve(),
      revokeUserSessions: () => Promise.resolve(),
    },
  };
}
