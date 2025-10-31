import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: 'node',
    // Run tests sequentially to avoid database conflicts
    // since all tests share the same SQLite database file
    fileParallelism: false,
    env: {
      VITEST: 'true',
      NODE_ENV: 'test'
    }
  },
  resolve: {
    alias: {
      $lib: resolve('./src/lib')
    }
  }
});