import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { processarFallbackInstagram } from '@/lib/conectores/instagram';
import type { FormularioInstagramInput } from '@/lib/schemas/manual';

function criarClienteMock() {
  const camposInseridos: Array<{ campo: string; valor: unknown }> = [];
  const chamadasFonteUpdate: unknown[] = [];

  const from = vi.fn((tabela: string) => {
    if (tabela === 'campo_extraido') {
      return {
        insert: vi.fn(async (valores: { campo: string; valor: unknown }) => {
          camposInseridos.push(valores);
          return { data: null, error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            const promessa = Promise.resolve({ data: [] as unknown[], error: null });
            return Object.assign(promessa, {
              in: vi.fn(async (_coluna: string, valores: string[]) => ({
                data: camposInseridos.filter((c) => valores.includes(c.campo)),
                error: null,
              })),
            });
          }),
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
});
