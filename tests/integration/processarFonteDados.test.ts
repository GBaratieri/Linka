import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { processarFonteDados } from '@/lib/conectores/normalizador';

function criarClienteMock() {
  const camposPorEmpresa = new Map<string, Array<{ id: string; campo: string; valor: unknown }>>();
  const chamadasFonteUpdate: unknown[] = [];
  const eventosRegistrados: Array<{ tipo: string; payload: unknown }> = [];
  let proximoId = 1;

  const from = vi.fn((tabela: string) => {
    if (tabela === 'campo_extraido') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_coluna: string, empresaId: string) => {
            const promessa = Promise.resolve({
              data: camposPorEmpresa.get(empresaId) ?? [],
              error: null,
            });
            return Object.assign(promessa, {
              in: vi.fn(async (_coluna2: string, valores: string[]) => ({
                data: (camposPorEmpresa.get(empresaId) ?? []).filter((c) =>
                  valores.includes(c.campo),
                ),
                error: null,
              })),
            });
          }),
        })),
        upsert: vi.fn(async (valores: { empresa_id: string; campo: string; valor: unknown }) => {
          const lista = camposPorEmpresa.get(valores.empresa_id) ?? [];
          lista.push({ id: String(proximoId++), campo: valores.campo, valor: valores.valor });
          camposPorEmpresa.set(valores.empresa_id, lista);
          return { data: null, error: null };
        }),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
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

    if (tabela === 'evento_pesquisa') {
      return {
        insert: vi.fn(async (valores: { tipo: string; payload: unknown }) => {
          eventosRegistrados.push(valores);
          return { data: null, error: null };
        }),
      };
    }

    throw new Error(`Tabela não mockada neste teste: ${tabela}`);
  });

  return {
    cliente: { from } as unknown as SupabaseClient<Database>,
    camposPorEmpresa,
    chamadasFonteUpdate,
    eventosRegistrados,
  };
}

describe('processarFonteDados (fluxo completo, USE_MOCKS=true)', () => {
  const urlsDeTresNegocios = [
    'https://maps.app.goo.gl/negocio-um',
    'https://maps.app.goo.gl/negocio-dois-abc',
    'https://maps.app.goo.gl/negocio-tres-xyz-mais-longo',
  ];

  it.each(urlsDeTresNegocios)(
    'extrai e grava os campos para %s sem inventar dados',
    async (url) => {
      const { cliente, camposPorEmpresa, chamadasFonteUpdate, eventosRegistrados } =
        criarClienteMock();
      const empresaId = `empresa-${url}`;

      const status = await processarFonteDados(cliente, empresaId, {
        id: 'fonte-1',
        tipo: 'google',
        url,
      });

      const campos = camposPorEmpresa.get(empresaId) ?? [];
      const camposPorNome = Object.fromEntries(campos.map((c) => [c.campo, c.valor]));

      expect(camposPorNome.nome).toBeTruthy();
      expect(camposPorNome['endereco.texto']).toBeTruthy();
      expect(camposPorNome['contato.telefone']).toBeTruthy();
      // Sem WhatsApp nas fixtures do Google: nunca inventar.
      expect(camposPorNome['contato.whatsapp']).toBeUndefined();

      expect(status).toBe('ok');
      expect(chamadasFonteUpdate[0]).toMatchObject({ status: 'ok' });
      expect(eventosRegistrados.some((e) => e.tipo === 'extracao_concluida')).toBe(true);
    },
  );

  it('produz empresas diferentes para links diferentes', async () => {
    const nomes = new Set<string>();

    for (const url of urlsDeTresNegocios) {
      const { cliente, camposPorEmpresa } = criarClienteMock();
      const empresaId = `empresa-${url}`;
      await processarFonteDados(cliente, empresaId, { id: 'fonte-1', tipo: 'google', url });
      const campos = camposPorEmpresa.get(empresaId) ?? [];
      const nome = campos.find((c) => c.campo === 'nome')?.valor as string;
      nomes.add(nome);
    }

    expect(nomes.size).toBeGreaterThanOrEqual(2);
  });

  it('marca a fonte do Instagram como não configurada sem tentar extrair nada', async () => {
    const { cliente, chamadasFonteUpdate, camposPorEmpresa } = criarClienteMock();

    const status = await processarFonteDados(cliente, 'empresa-instagram', {
      id: 'fonte-2',
      tipo: 'instagram',
      url: 'https://instagram.com/empresa',
    });

    expect(status).toBe('nao_configurado');
    expect(chamadasFonteUpdate[0]).toEqual({ status: 'nao_configurado' });
    expect(camposPorEmpresa.get('empresa-instagram') ?? []).toHaveLength(0);
  });

  it('não faz nada para uma fonte manual (o formulário grava direto)', async () => {
    const { cliente, chamadasFonteUpdate } = criarClienteMock();

    const status = await processarFonteDados(cliente, 'empresa-manual', {
      id: 'fonte-3',
      tipo: 'manual',
      url: null,
    });

    expect(status).toBe('pendente');
    expect(chamadasFonteUpdate).toHaveLength(0);
  });
});
