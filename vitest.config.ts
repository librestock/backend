import { defineConfig } from 'vitest/config';
import path from 'path';

// @librestock/types has "type": "module" in its package.json, but its ESM
// build omits .js extensions on relative re-exports (a TypeScript tsc defect).
// Node.js strict ESM resolution can't resolve them. The CJS build (dist/cjs/)
// works fine. This plugin redirects every @librestock/types/* import to the
// CJS build so Vite/Node loads CommonJS instead of broken ESM.
function librestockCjsPlugin() {
  const pkgRoot = path.resolve(
    __dirname,
    'node_modules/@librestock/types',
  );
  const cjsRoot = path.join(pkgRoot, 'dist/cjs');

  return {
    name: 'librestock-types-cjs',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (!id.startsWith('@librestock/types')) return null;
      const subpath = id.slice('@librestock/types'.length); // e.g. '/audit-logs' or ''
      if (subpath) {
        return path.join(cjsRoot, subpath, 'index.js');
      }
      return path.join(cjsRoot, 'index.js');
    },
  };
}

export default defineConfig({
  plugins: [librestockCjsPlugin()],
  test: {
    include: ['src/**/*.effect.spec.ts'],
    environment: 'node',
    deps: {
      optimizer: {
        ssr: {
          // Force Vite to process @librestock/types through its bundler,
          // so the plugin's resolveId runs for all transitive imports.
          include: ['@librestock/types'],
        },
      },
    },
  },
});
