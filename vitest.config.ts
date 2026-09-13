import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Local Orca worktrees are independent checkouts and must not be
    // collected as duplicate tests by the parent repository.
    exclude: [...configDefaults.exclude, '.worktrees/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
