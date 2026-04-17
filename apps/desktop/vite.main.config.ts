import { builtinModules } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

import { packageAliases } from './vite.package-aliases';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      fileName: () => 'main.js',
      formats: ['cjs'],
    },
    outDir: '.vite/build',
    rollupOptions: {
      external: ['electron', ...builtinModules, ...builtinModules.map((module) => `node:${module}`)],
      output: {
        entryFileNames: 'main.js',
      },
    },
    sourcemap: true,
    target: 'node20',
  },
  resolve: {
    alias: packageAliases,
  },
});
