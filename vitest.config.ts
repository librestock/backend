import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.effect.spec.ts'],
    exclude: ['**/node_modules/**', 'src/**/*.integration.spec.ts'],
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup-env.ts'],
  },
});
