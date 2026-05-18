interface BetterAuthApi {
  listUsers: (
    ...args: unknown[]
  ) => Promise<{ users: unknown[]; total: number }>;
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
      runMigrations: async () => {},
    }),
    api: {
      listUsers: async () => ({ users: [], total: 0 }),
      banUser: async () => {},
      unbanUser: async () => {},
      removeUser: async () => {},
      revokeUserSessions: async () => {},
    },
  };
}
