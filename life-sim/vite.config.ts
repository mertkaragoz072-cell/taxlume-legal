/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['src/tests/**/*.test.ts'], environment: 'node' },
});
