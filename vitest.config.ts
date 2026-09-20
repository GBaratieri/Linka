import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // tests/rls precisa de um Postgres real (supabase start) e roda à parte
    // via `npm run test:rls` (vitest.rls.config.ts) — não faz parte do
    // `npm run test` padrão, que precisa continuar rodando sem nenhuma
    // credencial externa (regra 4 do CLAUDE.md).
    exclude: ['node_modules/**', 'tests/rls/**'],
  },
});
