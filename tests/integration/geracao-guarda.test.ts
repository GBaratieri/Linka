import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { ConteudoSite } from '@/lib/schemas/estilo';
import type { PedidoEstilo } from '@/lib/schemas/estilo';

const gerarTextosMock = vi.fn();
const verificarConteudoMock = vi.fn();
const sanitizarConteudoMock = vi.fn();

vi.mock('@/lib/ia/textos', () => ({ gerarTextos: gerarTextosMock }));
vi.mock('@/lib/ia/guardas', () => ({
  verificarConteudo: verificarConteudoMock,
  sanitizarConteudo: sanitizarConteudoMock,
}));

// Importado depois dos vi.mock (hoisted) para pegar as versões mockadas.
const { gerarNovaVersaoDoSite } = await import('@/lib/site/geracao');

function chainableFinal(data: unknown, error: unknown = null) {
  const resultado = { data, error };
  const promessa = Promise.resolve(resultado);
  const obj: Record<string, unknown> = {};
  obj.eq = vi.fn(() => obj);
  obj.gte = vi.fn(() => obj);
  obj.order = vi.fn(() => obj);
  obj.limit = vi.fn(() => obj);
  obj.single = vi.fn(() => promessa);
  obj.maybeSingle = vi.fn(() => promessa);
  obj.then = promessa.then.bind(promessa);
  return obj;
}

function criarClienteMock() {
  const versoesInseridas: Array<Record<string, unknown>> = [];
  const eventos: Array<{ tipo: string; payload: unknown }> = [];

  const from = vi.fn((tabela: string) => {
    if (tabela === 'empresa') {
      return { select: vi.fn(() => chainableFinal({ segmento: 'servicos', cidade: 'São Paulo' })) };
    }
    if (tabela === 'campo_extraido') {
      return {
        select: vi.fn(() =>
          chainableFinal([
            { campo: 'nome', valor: 'Empresa Teste', origem: 'manual', confianca: 'alta', editado_pelo_usuario: true },
          ]),
        ),
      };
    }
    if (tabela === 'evento_produto') {
      return {
        select: vi.fn(() => chainableFinal([])),
        insert: vi.fn(async (valores: { tipo: string; payload: unknown }) => {
          eventos.push(valores);
          return { data: null, error: null };
        }),
      };
    }
    if (tabela === 'template') {
      return {
        select: vi.fn(() => chainableFinal({ id: 'template-1', componentes: ['hero'] })),
      };
    }
    if (tabela === 'site') {
      return {
        select: vi.fn(() => chainableFinal(null)),
        insert: vi.fn(() => ({ select: vi.fn(() => chainableFinal({ id: 'site-1' })) })),
      };
    }
    if (tabela === 'versao_site') {
      return {
        insert: vi.fn(async (valores: Record<string, unknown>) => {
          versoesInseridas.push(valores);
          return { data: null, error: null };
        }),
      };
    }
    throw new Error(`Tabela não mockada neste teste: ${tabela}`);
  });

  return { cliente: { from } as unknown as SupabaseClient<Database>, versoesInseridas, eventos };
}

const CONTEUDO_BASE: ConteudoSite = {
  hero: { titulo: 'Empresa Teste', subtitulo: 'sub' },
  sobre: null,
  servicos: [],
  cta_principal: 'Fale com a gente',
  seo: { titulo_pagina: 'Empresa Teste', descricao_pagina: 'desc', h1: 'Empresa Teste' },
};

const PEDIDO: PedidoEstilo = { texto: 'moderno', referencia: null };

describe('gerarNovaVersaoDoSite — caminho da guarda anti-alucinação', () => {
  afterEach(() => {
    gerarTextosMock.mockReset();
    verificarConteudoMock.mockReset();
    sanitizarConteudoMock.mockReset();
  });

  it('quando a guarda aprova de primeira, não tenta de novo nem sanitiza', async () => {
    gerarTextosMock.mockResolvedValue(CONTEUDO_BASE);
    verificarConteudoMock.mockReturnValue({ aprovado: true, problemas: [] });

    const { cliente, versoesInseridas, eventos } = criarClienteMock();
    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(true);
    expect(gerarTextosMock).toHaveBeenCalledTimes(1);
    expect(sanitizarConteudoMock).not.toHaveBeenCalled();
    expect(versoesInseridas[0]?.conteudo).toEqual(CONTEUDO_BASE);
    expect(eventos.find((e) => e.tipo === 'site_gerado')?.payload).toMatchObject({ tentativaExtra: false });
  });

  it('quando a guarda reprova a primeira tentativa mas aprova a segunda, usa o conteúdo da segunda tentativa', async () => {
    const conteudoRegenerado: ConteudoSite = { ...CONTEUDO_BASE, hero: { titulo: 'Versão 2', subtitulo: 'sub2' } };
    gerarTextosMock.mockResolvedValueOnce(CONTEUDO_BASE).mockResolvedValueOnce(conteudoRegenerado);
    verificarConteudoMock
      .mockReturnValueOnce({ aprovado: false, problemas: ['telefone inventado'] })
      .mockReturnValueOnce({ aprovado: true, problemas: [] });

    const { cliente, versoesInseridas, eventos } = criarClienteMock();
    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(true);
    expect(gerarTextosMock).toHaveBeenCalledTimes(2);
    expect(sanitizarConteudoMock).not.toHaveBeenCalled();
    expect(versoesInseridas[0]?.conteudo).toEqual(conteudoRegenerado);
    expect(eventos.find((e) => e.tipo === 'site_gerado')?.payload).toMatchObject({ tentativaExtra: true });
  });

  it('quando as duas tentativas reprovam a guarda, sanitiza o conteúdo da segunda tentativa como último recurso', async () => {
    const conteudoSegundaTentativa: ConteudoSite = { ...CONTEUDO_BASE, hero: { titulo: 'Versão 2', subtitulo: 'sub2' } };
    const conteudoSanitizado: ConteudoSite = { ...CONTEUDO_BASE, hero: { titulo: 'Empresa Teste', subtitulo: '' } };
    gerarTextosMock.mockResolvedValueOnce(CONTEUDO_BASE).mockResolvedValueOnce(conteudoSegundaTentativa);
    verificarConteudoMock.mockReturnValue({ aprovado: false, problemas: ['ainda com problema'] });
    sanitizarConteudoMock.mockReturnValue(conteudoSanitizado);

    const { cliente, versoesInseridas } = criarClienteMock();
    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(true);
    expect(gerarTextosMock).toHaveBeenCalledTimes(2);
    // Sanitiza a partir do conteúdo da SEGUNDA tentativa (o mais recente),
    // não da primeira.
    expect(sanitizarConteudoMock).toHaveBeenCalledExactlyOnceWith(
      conteudoSegundaTentativa,
      expect.anything(),
    );
    expect(versoesInseridas[0]?.conteudo).toEqual(conteudoSanitizado);
  });

  it('nunca persiste um conteúdo que a guarda reprovou sem sanitizar antes', async () => {
    gerarTextosMock.mockResolvedValue(CONTEUDO_BASE);
    verificarConteudoMock.mockReturnValue({ aprovado: false, problemas: ['endereço inventado'] });
    sanitizarConteudoMock.mockReturnValue({ ...CONTEUDO_BASE, sobre: null });

    const { cliente, versoesInseridas } = criarClienteMock();
    await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(sanitizarConteudoMock).toHaveBeenCalledTimes(1);
    // O conteúdo salvo é sempre o resultado (sanitizado), nunca o bruto
    // reprovado da segunda tentativa.
    expect(versoesInseridas[0]?.conteudo).toEqual({ ...CONTEUDO_BASE, sobre: null });
  });
});
