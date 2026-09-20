import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Config separada para os testes de RLS (Row Level Security): rodam contra
// um Postgres de verdade (via `supabase start`), não contra um cliente
// mockado — RLS é aplicado pelo próprio Postgres, então não dá para testar
// com mocks. Por isso ficam fora do `npm run test` padrão (que precisa
// continuar rápido e sem nenhuma credencial externa) e só rodam via
// `npm run test:rls`, documentado em supabase/README.md.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rls/**/*.test.ts'],
    // Testes de RLS criam usuários/dados reais e limpam via API admin —
    // rodar em série evita testes concorrentes pisando nos dados uns dos
    // outros no mesmo banco local.
    fileParallelism: false,
  },
});
