import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { criarEmpresaComLink, criarEmpresaManual } from '@/lib/conectores/criarEmpresa';

interface ErroFake {
  message: string;
}

interface Comportamento {
  empresa?: { id?: string; erro?: ErroFake };
  fonteDados?: { erro?: ErroFake };
}

function criarClienteMock(comportamento: Comportamento = {}) {
  const chamadas: {
    empresaInsert?: unknown;
    fonteDadosInsert?: unknown;
    eventoPesquisaInsert?: unknown;
  } = {};

  const from = vi.fn((tabela: string) => {
    if (tabela === 'empresa') {
      return {
        insert: vi.fn((valores: unknown) => {
          chamadas.empresaInsert = valores;
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                if (comportamento.empresa?.erro) {
                  return { data: null, error: comportamento.empresa.erro };
                }
                return { data: { id: comportamento.empresa?.id ?? 'empresa-1' }, error: null };
              }),
            })),
          };
        }),
      };
    }

    if (tabela === 'fonte_dados') {
      return {
        insert: vi.fn(async (valores: unknown) => {
          chamadas.fonteDadosInsert = valores;
          if (comportamento.fonteDados?.erro) {
            return { data: null, error: comportamento.fonteDados.erro };
          }
          return { data: null, error: null };
        }),
      };
    }

    if (tabela === 'evento_pesquisa') {
      return {
        insert: vi.fn(async (valores: unknown) => {
          chamadas.eventoPesquisaInsert = valores;
          return { data: null, error: null };
        }),
      };
    }

    throw new Error(`Tabela não mockada neste teste: ${tabela}`);
  });

  return { cliente: { from } as unknown as SupabaseClient<Database>, chamadas, from };
}

describe('criarEmpresaComLink', () => {
  it('cria a empresa e a fonte de dados para um link válido do Instagram', async () => {
    const { cliente, chamadas } = criarClienteMock({ empresa: { id: 'empresa-abc' } });

    const resultado = await criarEmpresaComLink(
      cliente,
      'usuario-1',
      'https://instagram.com/minha-empresa',
    );

    expect(resultado).toEqual({ sucesso: true, empresaId: 'empresa-abc' });
    expect(chamadas.empresaInsert).toEqual({ usuario_id: 'usuario-1' });
    expect(chamadas.fonteDadosInsert).toMatchObject({
      empresa_id: 'empresa-abc',
      tipo: 'instagram',
      status: 'pendente',
    });
    expect(chamadas.eventoPesquisaInsert).toMatchObject({
      empresa_id: 'empresa-abc',
      tipo: 'link_colado',
    });
  });

  it('rejeita um link inválido sem consultar o banco', async () => {
    const { cliente, from } = criarClienteMock();

    const resultado = await criarEmpresaComLink(
      cliente,
      'usuario-1',
      'https://facebook.com/empresa',
    );

    expect(resultado.sucesso).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('retorna um erro amigável quando a criação da empresa falha', async () => {
    const { cliente } = criarClienteMock({ empresa: { erro: { message: 'falhou' } } });

    const resultado = await criarEmpresaComLink(
      cliente,
      'usuario-1',
      'https://instagram.com/empresa',
    );

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível criar a empresa. Tente novamente.',
    });
  });

  it('retorna um erro amigável quando o registro da fonte de dados falha', async () => {
    const { cliente } = criarClienteMock({ fonteDados: { erro: { message: 'falhou' } } });

    const resultado = await criarEmpresaComLink(
      cliente,
      'usuario-1',
      'https://instagram.com/empresa',
    );

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível registrar a fonte de dados. Tente novamente.',
    });
  });
});

describe('criarEmpresaManual', () => {
  it('cria a empresa com uma fonte de dados do tipo manual, sem URL', async () => {
    const { cliente, chamadas } = criarClienteMock({ empresa: { id: 'empresa-manual' } });

    const resultado = await criarEmpresaManual(cliente, 'usuario-1');

    expect(resultado).toEqual({ sucesso: true, empresaId: 'empresa-manual' });
    expect(chamadas.fonteDadosInsert).toMatchObject({
      empresa_id: 'empresa-manual',
      tipo: 'manual',
      url: null,
      status: 'pendente',
    });
  });
});
