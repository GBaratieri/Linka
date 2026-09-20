import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { processarFallbackInstagram } from '@/lib/conectores/instagram';
import type { FormularioInstagramInput } from '@/lib/schemas/manual';

interface LinhaMock {
  campo: string;
  valor: unknown;
  origem: string;
  confianca: string;
}

type ResultadoConsulta =
  | { data: LinhaMock[]; error: null }
  | { data: null; error: { message: string } };

// Encadeável o bastante para cobrir `.select().eq()` (direto) e
// `.select().eq().in(...).order(...)` (usado por sincronizarNomeESegmento).
function consultaEncadeavel(
  resultado: ResultadoConsulta,
): PromiseLike<ResultadoConsulta> & {
  in: (coluna: string, valores: string[]) => ReturnType<typeof consultaEncadeavel>;
  order: () => ReturnType<typeof consultaEncadeavel>;
} {
  const promessa = Promise.resolve(resultado);
  return Object.assign(promessa, {
    in: (_coluna: string, valores: string[]) =>
      resultado.error
        ? consultaEncadeavel(resultado)
        : consultaEncadeavel({
            data: resultado.data.filter((linha) => valores.includes(linha.campo)),
            error: null,
          }),
    order: () => consultaEncadeavel(resultado),
  });
}

function criarClienteMock(opcoes: { erroConsulta?: boolean } = {}) {
  const camposInseridos: LinhaMock[] = [];
  const chamadasFonteUpdate: unknown[] = [];

  const from = vi.fn((tabela: string) => {
    if (tabela === 'campo_extraido') {
      return {
        upsert: vi.fn(async (valores: LinhaMock) => {
          camposInseridos.push(valores);
          return { data: null, error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            opcoes.erroConsulta
              ? consultaEncadeavel({ data: null, error: { message: 'falhou' } })
              : consultaEncadeavel({ data: [...camposInseridos], error: null }),
          ),
        })),
      };
    }

    if (tabela === 'empresa') {
      return { update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })) };
    }

    if (tabela === 'fonte_dados') {
      return {
        update: vi.fn((valores: unknown) => ({
          eq: vi.fn(async () => {
            chamadasFonteUpdate.push(valores);
            return { data: null, error: null };
          }),
        })),
      };
    }

    throw new Error(`Tabela não mockada neste teste: ${tabela}`);
  });

  return {
    cliente: { from } as unknown as SupabaseClient<Database>,
    camposInseridos,
    chamadasFonteUpdate,
  };
}

describe('processarFallbackInstagram', () => {
  it('estrutura a bio e grava os campos extraídos com origem instagram', async () => {
    const { cliente, camposInseridos, chamadasFonteUpdate } = criarClienteMock();

    const dados: FormularioInstagramInput = {
      bio: 'Salão de beleza e cabelo em Curitiba. Agende pelo WhatsApp!',
      telefoneOuWhatsapp: '41999998888',
    };

    await processarFallbackInstagram(
      cliente,
      'empresa-1',
      'fonte-1',
      'https://instagram.com/salao.bela_hair',
      dados,
      ['https://exemplo.com/foto1.jpg'],
    );

    const camposPorNome = Object.fromEntries(camposInseridos.map((c) => [c.campo, c.valor]));

    expect(camposPorNome.nome).toBe('Salao Bela Hair');
    expect(camposPorNome.segmento).toBe('servicos');
    expect(camposPorNome['contato.whatsapp']).toBe('41999998888');
    expect(camposPorNome['contato.instagram']).toBe('salao.bela_hair');
    expect(camposPorNome['midia.fotos']).toEqual(['https://exemplo.com/foto1.jpg']);
    expect(camposPorNome['endereco.texto']).toBeUndefined();

    expect(chamadasFonteUpdate[0]).toMatchObject({ status: 'ok' });
  });

  it('não inventa nome/handle quando o link do Instagram não tem usuário no caminho', async () => {
    const { cliente, camposInseridos } = criarClienteMock();

    const dados: FormularioInstagramInput = {
      bio: 'Fazemos entregas em toda a cidade!',
      telefoneOuWhatsapp: null,
    };

    await processarFallbackInstagram(cliente, 'empresa-2', 'fonte-2', 'https://instagram.com', dados, []);

    const camposGravados = camposInseridos.map((c) => c.campo);
    expect(camposGravados).not.toContain('nome');
    expect(camposGravados).not.toContain('contato.instagram');
  });

  it('devolve sucesso: false em vez de lançar quando a gravação falha', async () => {
    const { cliente, chamadasFonteUpdate } = criarClienteMock({ erroConsulta: true });

    const dados: FormularioInstagramInput = {
      bio: 'Salão de beleza e cabelo em Curitiba.',
      telefoneOuWhatsapp: '41999998888',
    };

    const resultado = await processarFallbackInstagram(
      cliente,
      'empresa-3',
      'fonte-3',
      'https://instagram.com/salao.bela_hair',
      dados,
      [],
    );

    expect(resultado).toEqual({ sucesso: false });
    // Não marca a fonte como "ok" quando a gravação falhou.
    expect(chamadasFonteUpdate).toHaveLength(0);
  });
});
