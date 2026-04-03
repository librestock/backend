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
    globals: true,
    environment: 'node',
  },
});
