import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  cacheDir: path.resolve(__dirname, '.vite-cache'),
  build: {
    outDir: 'dist',
  },
});
