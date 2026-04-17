import path from 'node:path';
import { defineConfig } from 'vite';

import { packageAliases } from './vite.package-aliases';

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: false,
    outDir: '.vite/renderer/main_window',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: packageAliases,
  },
});
