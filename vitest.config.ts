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
    },
    coverage: {
      provider: 'v8', // or 'istanbul'
      include: ['src/**/*.{js,ts,svelte}'], // Add this line
      exclude: [
        'node_modules/',
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/mockData.{js,ts}'
      ]
    }
  },
  resolve: {
    alias: {
      $lib: resolve('./src/lib')
    }
  }
});