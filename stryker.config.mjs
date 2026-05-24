export default {
  packageManager: 'pnpm',
  plugins: [
    '@stryker-mutator/vitest-runner',
    '@stryker-mutator/typescript-checker',
  ],
  testRunner: 'vitest',
  checkers: ['typescript'],
  coverageAnalysis: 'off',
  ignorePatterns: [
    '/.direnv',
    '/.jj',
    '/build',
    '/coverage',
    '/dist',
    '/effect-code',
  ],
  mutate: [
    'src/auth-cookie-domain.ts',
    'src/effect/platform/bulk-operation.utils.ts',
    'src/effect/platform/messages.ts',
  ],
  reporters: ['progress', 'clear-text', 'html'],
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  vitest: {
    configFile: 'vitest.config.ts',
    related: true,
  },
  typescriptChecker: {
    prioritizePerformanceOverAccuracy: false,
  },
};
