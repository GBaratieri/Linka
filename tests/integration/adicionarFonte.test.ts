import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { adicionarFonteComLink, adicionarFonteManual } from '@/lib/conectores/adicionarFonte';

interface Comportamento {
  erroInsertFonte?: { message: string; code?: string };
}

function criarClienteMock(comportamento: Comportamento = {}) {
  const chamadas: { fonteInsert?: unknown; eventoInsert?: unknown } = {};

  const from = vi.fn((tabela: string) => {
    if (tabela === 'fonte_dados') {
      return {
        insert: vi.fn(async (valores: unknown) => {
          chamadas.fonteInsert = valores;
          if (comportamento.erroInsertFonte) {
            return { data: null, error: comportamento.erroInsertFonte };
          }
          return { data: null, error: null };
        }),
      };
    }

    if (tabela === 'evento_produto') {
      return {
        insert: vi.fn(async (valores: unknown) => {
          chamadas.eventoInsert = valores;
          return { data: null, error: null };
        }),
      };
    }

    throw new Error(`Tabela não mockada neste teste: ${tabela}`);
  });

  return { cliente: { from } as unknown as SupabaseClient<Database>, chamadas, from };
}

describe('adicionarFonteComLink', () => {
  it('registra uma nova fonte quando a empresa ainda não tem uma desse tipo', async () => {
    const { cliente, chamadas } = criarClienteMock();

    const resultado = await adicionarFonteComLink(
      cliente,
      'empresa-1',
      'https://instagram.com/minha-empresa',
    );

    expect(resultado).toEqual({ sucesso: true });
    expect(chamadas.fonteInsert).toMatchObject({
      empresa_id: 'empresa-1',
      tipo: 'instagram',
      status: 'pendente',
    });
    expect(chamadas.eventoInsert).toMatchObject({
      empresa_id: 'empresa-1',
      tipo: 'fonte_adicional_colada',
    });
  });

  it('rejeita quando a empresa já tem uma fonte desse tipo (constraint única do banco)', async () => {
    const { cliente, chamadas } = criarClienteMock({
      erroInsertFonte: { message: 'duplicate key value violates unique constraint', code: '23505' },
    });

    const resultado = await adicionarFonteComLink(
      cliente,
      'empresa-1',
      'https://instagram.com/minha-empresa',
    );

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Essa empresa já tem uma fonte desse tipo. Escolha um tipo diferente para comparar.',
    });
    expect(chamadas.eventoInsert).toBeUndefined();
  });

  it('rejeita um link inválido sem consultar o banco', async () => {
    const { cliente, from } = criarClienteMock();

    const resultado = await adicionarFonteComLink(cliente, 'empresa-1', 'https://facebook.com/x');

    expect(resultado.sucesso).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('retorna um erro amigável quando a gravação da fonte falha', async () => {
    const { cliente } = criarClienteMock({ erroInsertFonte: { message: 'falhou' } });

    const resultado = await adicionarFonteComLink(
      cliente,
      'empresa-1',
      'https://instagram.com/minha-empresa',
    );

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível registrar a fonte de dados. Tente novamente.',
    });
  });
});

describe('adicionarFonteManual', () => {
  it('registra uma fonte manual sem URL', async () => {
    const { cliente, chamadas } = criarClienteMock();

    const resultado = await adicionarFonteManual(cliente, 'empresa-1');

    expect(resultado).toEqual({ sucesso: true });
    expect(chamadas.fonteInsert).toMatchObject({
      empresa_id: 'empresa-1',
      tipo: 'manual',
      url: null,
      status: 'pendente',
    });
  });
});
