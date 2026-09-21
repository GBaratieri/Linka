import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { gerarNovaVersaoDoSite } from '@/lib/site/geracao';
import { LIMITE_GERACOES_POR_MES } from '@/lib/config/planos';
import type { PedidoEstilo } from '@/lib/schemas/estilo';

interface LinhaCampo {
  campo: string;
  valor: unknown;
  origem: string;
  confianca: string;
  editado_pelo_usuario: boolean;
}

interface Cenario {
  empresa: { segmento: string | null; cidade: string | null } | null;
  linhas: LinhaCampo[];
  geracoesJaUsadas: number;
  templatePorSegmento: Record<string, { id: string; componentes: unknown } | null>;
  siteExistente: { id: string } | null;
  // Simula duas chamadas concorrentes batendo na constraint única: o select
  // inicial não acha nada, o insert falha com 23505, e um segundo select
  // (a recuperação) acha o site que a outra chamada acabou de criar.
  corridaAoCriarSite?: { siteCriadoPelaOutraChamada: { id: string } };
  // Simula uma falha de rede (promessa rejeitada, não só um `error` no
  // retorno) ao gravar o evento "estilo_enviado" — precisa continuar dentro
  // do try/catch da função pra virar o erro amigável, não uma exceção solta.
  estiloEnviadoRejeita?: boolean;
}

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

function criarClienteMock(cenario: Cenario) {
  const eventos: Array<{ tipo: string; payload: unknown }> = [];
  const versoesInseridas: Array<Record<string, unknown>> = [];
  const sitesInseridos: Array<Record<string, unknown>> = [];
  // Fora de `from`, de propósito: o código real chama `.from('site')` várias
  // vezes (select inicial, insert, select de recuperação) — se o contador
  // morasse dentro de `from`, cada chamada reiniciaria em 0.
  let chamadasSelectSite = 0;

  const from = vi.fn((tabela: string) => {
    if (tabela === 'empresa') {
      return { select: vi.fn(() => chainableFinal(cenario.empresa)) };
    }

    if (tabela === 'campo_extraido') {
      return { select: vi.fn(() => chainableFinal(cenario.linhas)) };
    }

    if (tabela === 'evento_produto') {
      return {
        select: vi.fn(() =>
          chainableFinal(Array.from({ length: cenario.geracoesJaUsadas }, (_, i) => ({ id: `ev-${i}` }))),
        ),
        insert: vi.fn(async (valores: { tipo: string; payload: unknown }) => {
          if (cenario.estiloEnviadoRejeita && valores.tipo === 'estilo_enviado') {
            throw new Error('falha de rede simulada');
          }
          eventos.push(valores);
          return { data: null, error: null };
        }),
      };
    }

    if (tabela === 'template') {
      return {
        select: vi.fn(() => {
          let segmentoConsultado = '';
          const obj: Record<string, unknown> = {};
          obj.eq = vi.fn((_coluna: string, valor: string) => {
            segmentoConsultado = valor;
            return obj;
          });
          obj.limit = vi.fn(() => obj);
          const resolver = () =>
            Promise.resolve({ data: cenario.templatePorSegmento[segmentoConsultado] ?? null, error: null });
          obj.maybeSingle = vi.fn(resolver);
          obj.single = vi.fn(resolver);
          return obj;
        }),
      };
    }

    if (tabela === 'site') {
      return {
        select: vi.fn(() => {
          chamadasSelectSite += 1;
          if (cenario.corridaAoCriarSite) {
            // 1ª chamada (antes do insert): ninguém achou o site ainda.
            // 2ª chamada (recuperação após 23505): acha o que a "outra
            // chamada" concorrente criou.
            return chainableFinal(
              chamadasSelectSite === 1 ? null : cenario.corridaAoCriarSite.siteCriadoPelaOutraChamada,
            );
          }
          return chainableFinal(cenario.siteExistente);
        }),
        insert: vi.fn((valores: Record<string, unknown>) => {
          sitesInseridos.push(valores);
          if (cenario.corridaAoCriarSite) {
            return { select: vi.fn(() => chainableFinal(null, { code: '23505', message: 'duplicate key' })) };
          }
          return { select: vi.fn(() => chainableFinal({ id: 'site-novo' })) };
        }),
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

  return {
    cliente: { from } as unknown as SupabaseClient<Database>,
    eventos,
    versoesInseridas,
    sitesInseridos,
  };
}

const CENARIO_PADRAO: Cenario = {
  empresa: { segmento: 'alimentacao', cidade: 'São Paulo' },
  linhas: [
    { campo: 'nome', valor: 'Padaria Pão Quente', origem: 'google', confianca: 'alta', editado_pelo_usuario: false },
    {
      campo: 'contato.telefone',
      valor: '(11) 3456-7890',
      origem: 'google',
      confianca: 'alta',
      editado_pelo_usuario: false,
    },
  ],
  geracoesJaUsadas: 0,
  templatePorSegmento: {
    alimentacao: { id: 'template-alimentacao', componentes: ['hero', 'contato'] },
    servicos: { id: 'template-servicos', componentes: ['hero', 'servicos', 'contato'] },
  },
  siteExistente: null,
};

const PEDIDO: PedidoEstilo = { texto: 'moderno', referencia: null };

describe('gerarNovaVersaoDoSite', () => {
  it('gera com sucesso, cria o site e grava a versão quando não há site ainda', async () => {
    const { cliente, sitesInseridos, versoesInseridas } = criarClienteMock(CENARIO_PADRAO);

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado).toEqual({ sucesso: true, siteId: 'site-novo' });
    expect(sitesInseridos).toEqual([{ empresa_id: 'empresa-1' }]);
    expect(versoesInseridas).toHaveLength(1);
    expect(versoesInseridas[0]).toMatchObject({
      site_id: 'site-novo',
      template_id: 'template-alimentacao',
      estilo_texto: 'moderno',
    });
  });

  it('em corrida ao criar o site (duplo clique), recupera o site que a outra chamada criou em vez de falhar', async () => {
    const { cliente, sitesInseridos, versoesInseridas } = criarClienteMock({
      ...CENARIO_PADRAO,
      corridaAoCriarSite: { siteCriadoPelaOutraChamada: { id: 'site-da-outra-chamada' } },
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado).toEqual({ sucesso: true, siteId: 'site-da-outra-chamada' });
    // Tentou inserir (e bateu na constraint única) — não some o erro, mas
    // também não falha a geração por causa dele.
    expect(sitesInseridos).toEqual([{ empresa_id: 'empresa-1' }]);
    expect(versoesInseridas[0]).toMatchObject({ site_id: 'site-da-outra-chamada' });
  });

  it('reaproveita o site existente em vez de criar um novo', async () => {
    const { cliente, sitesInseridos, versoesInseridas } = criarClienteMock({
      ...CENARIO_PADRAO,
      siteExistente: { id: 'site-ja-existe' },
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado).toEqual({ sucesso: true, siteId: 'site-ja-existe' });
    expect(sitesInseridos).toHaveLength(0);
    expect(versoesInseridas[0]).toMatchObject({ site_id: 'site-ja-existe' });
  });

  it('bloqueia a geração quando o limite mensal do plano já foi atingido', async () => {
    const { cliente, versoesInseridas, eventos } = criarClienteMock({
      ...CENARIO_PADRAO,
      geracoesJaUsadas: LIMITE_GERACOES_POR_MES,
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erro).toContain(String(LIMITE_GERACOES_POR_MES));
    }
    expect(versoesInseridas).toHaveLength(0);
    // Nem chega a registrar "estilo_enviado" — o bloqueio é o primeiro passo.
    expect(eventos).toHaveLength(0);
  });

  it('permite gerar quando ainda não atingiu o limite (um abaixo dele)', async () => {
    const { cliente } = criarClienteMock({
      ...CENARIO_PADRAO,
      geracoesJaUsadas: LIMITE_GERACOES_POR_MES - 1,
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(true);
  });

  it('retorna erro amigável (em vez de propagar a exceção) quando o registro de "estilo_enviado" falha', async () => {
    const { cliente, versoesInseridas } = criarClienteMock({
      ...CENARIO_PADRAO,
      estiloEnviadoRejeita: true,
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível gerar o site agora. Tente novamente em instantes.',
    });
    expect(versoesInseridas).toHaveLength(0);
  });

  it('retorna erro amigável quando a empresa não é encontrada', async () => {
    const { cliente, versoesInseridas } = criarClienteMock({ ...CENARIO_PADRAO, empresa: null });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-inexistente', PEDIDO);

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível carregar os dados da empresa.',
    });
    expect(versoesInseridas).toHaveLength(0);
  });

  it('cai no template de "servicos" quando o segmento é "outro" (sem template próprio)', async () => {
    const { cliente, versoesInseridas } = criarClienteMock({
      ...CENARIO_PADRAO,
      empresa: { segmento: 'outro', cidade: null },
      templatePorSegmento: { outro: null, servicos: { id: 'template-servicos', componentes: ['hero'] } },
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(true);
    expect(versoesInseridas[0]).toMatchObject({ template_id: 'template-servicos' });
  });

  it('retorna erro amigável quando nem o template do segmento nem o de "servicos" existem', async () => {
    const { cliente, versoesInseridas } = criarClienteMock({
      ...CENARIO_PADRAO,
      templatePorSegmento: {},
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(false);
    expect(versoesInseridas).toHaveLength(0);
  });

  it('registra o evento "estilo_enviado" com o texto e a contagem de caracteres do pedido', async () => {
    const { cliente, eventos } = criarClienteMock(CENARIO_PADRAO);

    await gerarNovaVersaoDoSite(cliente, 'empresa-1', { texto: 'bem colorido e divertido', referencia: null });

    const evento = eventos.find((e) => e.tipo === 'estilo_enviado');
    expect(evento?.payload).toEqual({ texto: 'bem colorido e divertido', caracteres: 24 });
  });

  it('registra o evento "site_gerado" com tentativaExtra=false quando o conteúdo passa na guarda de primeira', async () => {
    const { cliente, eventos } = criarClienteMock(CENARIO_PADRAO);

    await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    const evento = eventos.find((e) => e.tipo === 'site_gerado');
    expect(evento?.payload).toMatchObject({ tentativaExtra: false });
  });

  it('nunca inventa dados: a empresa normalizada só reflete os campos efetivamente extraídos', async () => {
    const { cliente, versoesInseridas } = criarClienteMock({
      ...CENARIO_PADRAO,
      linhas: [
        { campo: 'nome', valor: 'Padaria Pão Quente', origem: 'google', confianca: 'alta', editado_pelo_usuario: false },
      ],
    });

    const resultado = await gerarNovaVersaoDoSite(cliente, 'empresa-1', PEDIDO);

    expect(resultado.sucesso).toBe(true);
    const conteudo = versoesInseridas[0]?.conteudo as { servicos: unknown[]; sobre: string | null };
    // Sem serviços nem descrição extraídos: o site gerado não pode ter
    // inventado nenhum dos dois.
    expect(conteudo.servicos).toEqual([]);
    expect(conteudo.sobre).toBeNull();
  });
});
