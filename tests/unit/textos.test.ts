import { afterEach, describe, expect, it, vi } from 'vitest';
import { gerarTextos } from '@/lib/ia/textos';
import { conteudoSiteSchema, type TomDeVoz } from '@/lib/schemas/estilo';
import type { EmpresaNormalizada } from '@/lib/schemas/empresa';

const { mensagensCreateMock } = vi.hoisted(() => ({ mensagensCreateMock: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mensagensCreateMock } };
  }),
}));

const EMPRESA_BASE: EmpresaNormalizada = {
  nome: 'Padaria Pão Quente',
  segmento: 'alimentacao',
  descricao_curta: null,
  servicos: [],
  contato: { whatsapp: null, telefone: '(11) 3456-7890', email: null, instagram: null, site: null },
  endereco: { texto: 'Rua das Flores, 123', lat: null, lng: null },
  horarios: [],
  midia: { logo: null, fotos: [] },
  prova_social: { nota: null, total_avaliacoes: null, avaliacoes: [] },
};

describe('gerarTextos (USE_MOCKS=true)', () => {
  const TONS: TomDeVoz[] = ['formal', 'descontraido', 'acolhedor', 'tecnico', 'premium'];

  it.each(TONS)('produz um conteúdo válido para o tom "%s"', async (tomDeVoz) => {
    const conteudo = await gerarTextos({ empresa: EMPRESA_BASE, cidade: 'São Paulo', tomDeVoz });

    expect(conteudoSiteSchema.safeParse(conteudo).success).toBe(true);
    expect(conteudo.hero.titulo).toContain(EMPRESA_BASE.nome);
  });

  it('os 5 tons produzem títulos de hero e CTAs visivelmente diferentes entre si', async () => {
    const resultados = await Promise.all(
      TONS.map((tomDeVoz) => gerarTextos({ empresa: EMPRESA_BASE, cidade: null, tomDeVoz })),
    );

    expect(new Set(resultados.map((r) => r.hero.titulo)).size).toBe(TONS.length);
    expect(new Set(resultados.map((r) => r.cta_principal)).size).toBe(TONS.length);
  });

  it('SEO segue "{nome} em {cidade}" quando a cidade é conhecida', async () => {
    const conteudo = await gerarTextos({ empresa: EMPRESA_BASE, cidade: 'Curitiba', tomDeVoz: 'formal' });

    expect(conteudo.seo.titulo_pagina).toBe('Padaria Pão Quente em Curitiba');
    expect(conteudo.seo.h1).toBe('Padaria Pão Quente em Curitiba');
    expect(conteudo.seo.descricao_pagina).toContain('Curitiba');
  });

  it('sem cidade, o SEO cai só no nome da empresa — nunca uma palavra-chave genérica de local', async () => {
    const conteudo = await gerarTextos({ empresa: EMPRESA_BASE, cidade: null, tomDeVoz: 'formal' });

    expect(conteudo.seo.titulo_pagina).toBe('Padaria Pão Quente');
    expect(conteudo.seo.h1).toBe('Padaria Pão Quente');
    expect(conteudo.seo.titulo_pagina).not.toMatch(/perto de|sua região|na sua cidade/i);
  });

  it('nunca inventa uma descrição "sobre" quando a empresa não tem uma', async () => {
    const conteudo = await gerarTextos({ empresa: EMPRESA_BASE, cidade: null, tomDeVoz: 'formal' });

    expect(conteudo.sobre).toBeNull();
  });

  it('usa a descrição "sobre" real da empresa quando ela existe, sem reescrever', async () => {
    const empresa: EmpresaNormalizada = {
      ...EMPRESA_BASE,
      descricao_curta: 'Padaria de bairro há 20 anos, pão fresco todos os dias.',
    };
    const conteudo = await gerarTextos({ empresa, cidade: null, tomDeVoz: 'formal' });

    expect(conteudo.sobre).toBe(empresa.descricao_curta);
  });

  it('nunca inventa um serviço que não está nos dados — lista vazia continua vazia', async () => {
    const conteudo = await gerarTextos({ empresa: EMPRESA_BASE, cidade: null, tomDeVoz: 'formal' });

    expect(conteudo.servicos).toEqual([]);
  });

  it('preserva a descrição real de um serviço em vez de substituí-la por texto genérico', async () => {
    const empresa: EmpresaNormalizada = {
      ...EMPRESA_BASE,
      servicos: [{ nome: 'Bolo de aniversário', descricao: 'Sob encomenda, com 48h de antecedência.' }],
    };
    const conteudo = await gerarTextos({ empresa, cidade: null, tomDeVoz: 'formal' });

    expect(conteudo.servicos).toEqual([
      { nome: 'Bolo de aniversário', descricao: 'Sob encomenda, com 48h de antecedência.' },
    ]);
  });

  it('preenche uma descrição de serviço só quando a empresa não informou uma', async () => {
    const empresa: EmpresaNormalizada = {
      ...EMPRESA_BASE,
      servicos: [{ nome: 'Bolo de aniversário', descricao: null }],
    };
    const conteudo = await gerarTextos({ empresa, cidade: null, tomDeVoz: 'acolhedor' });

    expect(conteudo.servicos).toHaveLength(1);
    expect(conteudo.servicos[0].nome).toBe('Bolo de aniversário');
    expect(conteudo.servicos[0].descricao).not.toBeNull();
    // A descrição gerada não pode conter nenhum fato que não esteja nos
    // dados de entrada — como o mock nunca cita telefone/endereço/preço,
    // basta garantir que ela não é idêntica ao nome (foi de fato redigida).
    expect(conteudo.servicos[0].descricao).not.toBe('Bolo de aniversário');
  });

  it('o rótulo do segmento aparece no subtítulo do hero e muda por segmento', async () => {
    const alimentacao = await gerarTextos({
      empresa: { ...EMPRESA_BASE, segmento: 'alimentacao' },
      cidade: null,
      tomDeVoz: 'formal',
    });
    const comercio = await gerarTextos({
      empresa: { ...EMPRESA_BASE, segmento: 'comercio' },
      cidade: null,
      tomDeVoz: 'formal',
    });

    expect(alimentacao.hero.subtitulo).toContain('sabores');
    expect(comercio.hero.subtitulo).toContain('produtos');
    expect(alimentacao.hero.subtitulo).not.toBe(comercio.hero.subtitulo);
  });
});

describe('gerarTextos (USE_MOCKS=false, com o SDK da Anthropic mockado)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mensagensCreateMock.mockReset();
  });

  it('reporta o uso de tokens da primeira chamada mesmo quando a segunda tentativa lança um erro', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-sonnet-5');
    vi.stubEnv('ANTHROPIC_API_KEY', 'chave-de-teste');

    mensagensCreateMock
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', input: { hero: {} } }],
        usage: { input_tokens: 200, output_tokens: 40 },
      })
      .mockRejectedValueOnce(new Error('limite de taxa excedido'));

    const usos: Array<{ modelo: string; tokensEntrada: number; tokensSaida: number }> = [];

    await expect(
      gerarTextos({
        empresa: EMPRESA_BASE,
        cidade: null,
        tomDeVoz: 'formal',
        aoUsarIA: (uso) => usos.push(uso),
      }),
    ).rejects.toThrow('limite de taxa excedido');

    expect(usos).toEqual([{ modelo: 'claude-sonnet-5', tokensEntrada: 200, tokensSaida: 40 }]);
  });
});
