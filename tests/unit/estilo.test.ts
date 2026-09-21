import { afterEach, describe, expect, it, vi } from 'vitest';
import { gerarEstilo } from '@/lib/ia/estilo';
import { estiloConfigSchema } from '@/lib/schemas/estilo';
import type { Segmento } from '@/lib/schemas/empresa';

const { mensagensCreateMock } = vi.hoisted(() => ({ mensagensCreateMock: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mensagensCreateMock } };
  }),
}));

describe('gerarEstilo (USE_MOCKS=true)', () => {
  const SEGMENTOS: Segmento[] = ['servicos', 'comercio', 'alimentacao', 'outro'];

  it.each([
    ['moderno', 'Inter'],
    ['elegante', 'Playfair Display'],
    ['divertido', 'Poppins'],
    ['minimalista', 'Montserrat'],
    ['rústico', 'Merriweather'],
  ])('chip "%s" produz um estilo válido e reconhecível (fonte %s)', async (texto, fonteEsperada) => {
    const estilo = await gerarEstilo({ texto, segmento: 'servicos', referencia: null });

    expect(estiloConfigSchema.safeParse(estilo).success).toBe(true);
    expect(estilo.tipografia.titulos).toBe(fonteEsperada);
  });

  it('é insensível a maiúsculas/minúsculas', async () => {
    const minusculo = await gerarEstilo({ texto: 'elegante', segmento: 'servicos', referencia: null });
    const maiusculo = await gerarEstilo({ texto: 'ELEGANTE', segmento: 'servicos', referencia: null });

    expect(maiusculo.tipografia.titulos).toBe(minusculo.tipografia.titulos);
    expect(maiusculo.paleta).toEqual(minusculo.paleta);
  });

  it('reconhece a palavra-chave dentro de uma frase livre, não só o chip isolado', async () => {
    const estilo = await gerarEstilo({
      texto: 'quero um visual bem rústico e aconchegante para a padaria',
      segmento: 'alimentacao',
      referencia: null,
    });

    expect(estilo.tipografia.titulos).toBe('Merriweather');
  });

  it('os 5 estilos de chip produzem paletas visivelmente diferentes entre si', async () => {
    const textos = ['moderno', 'elegante', 'divertido', 'minimalista', 'rústico'];
    const paletas = await Promise.all(
      textos.map(
        async (texto) => (await gerarEstilo({ texto, segmento: 'servicos', referencia: null })).paleta.primaria,
      ),
    );

    expect(new Set(paletas).size).toBe(textos.length);
  });

  it('quando o texto não bate com nenhuma palavra-chave, cai no padrão do segmento', async () => {
    const estilo = await gerarEstilo({
      texto: 'não sei bem o que eu quero',
      segmento: 'alimentacao',
      referencia: null,
    });

    // ESTILO_PADRAO_POR_SEGMENTO['alimentacao'] = ESTILO_RUSTICO.
    expect(estilo.tipografia.titulos).toBe('Merriweather');
  });

  it('quando o texto tem duas palavras-chave de estilos diferentes, a primeira da lista de prioridade vence', async () => {
    // "moderno" vem antes de "elegante" na ordem de prioridade dos chips.
    const estilo = await gerarEstilo({
      texto: 'quero algo moderno mas também elegante',
      segmento: 'servicos',
      referencia: null,
    });

    expect(estilo.tipografia.titulos).toBe('Inter');
  });

  it.each(SEGMENTOS)('as seções para o segmento "%s" vêm do segmento, não do chip de estilo', async (segmento) => {
    const comEstilo = await gerarEstilo({ texto: 'elegante', segmento, referencia: null });
    const semEstilo = await gerarEstilo({ texto: 'aleatório sem palavra-chave', segmento, referencia: null });

    // O pedido de estilo nunca deveria mudar QUAIS seções o site tem —
    // só a aparência (ver docs/decisoes.md, "template × estilo").
    expect(comEstilo.secoes).toEqual(semEstilo.secoes);
  });

  it('referência visual não altera o resultado no modo mock (nunca é buscada)', async () => {
    const semReferencia = await gerarEstilo({ texto: 'moderno', segmento: 'servicos', referencia: null });
    const comReferencia = await gerarEstilo({
      texto: 'moderno',
      segmento: 'servicos',
      referencia: 'https://exemplo.com/site-que-eu-gosto',
    });

    expect(comReferencia).toEqual(semReferencia);
  });
});

describe('gerarEstilo (USE_MOCKS=false, com o SDK da Anthropic mockado)', () => {
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
        content: [{ type: 'tool_use', input: { tema: 'invalido' } }],
        usage: { input_tokens: 50, output_tokens: 10 },
      })
      .mockRejectedValueOnce(new Error('limite de taxa excedido'));

    const usos: Array<{ modelo: string; tokensEntrada: number; tokensSaida: number }> = [];

    await expect(
      gerarEstilo({
        texto: 'moderno',
        segmento: 'servicos',
        referencia: null,
        aoUsarIA: (uso) => usos.push(uso),
      }),
    ).rejects.toThrow('limite de taxa excedido');

    expect(usos).toEqual([{ modelo: 'claude-sonnet-5', tokensEntrada: 50, tokensSaida: 10 }]);
  });

  it('valida a saída da IA pelo schema e tenta de novo se vier inválida', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-sonnet-5');
    vi.stubEnv('ANTHROPIC_API_KEY', 'chave-de-teste');

    const estiloValido = {
      tema: 'claro',
      paleta: { primaria: '#111111', secundaria: '#222222', fundo: '#FFFFFF', texto: '#000000' },
      tipografia: { titulos: 'Inter', corpo: 'Inter' },
      tom_de_voz: 'formal',
      densidade: 'media',
      raio_borda: 'medio',
      secoes: ['hero', 'contato'],
      destaque_cta: 'whatsapp',
    };

    mensagensCreateMock
      .mockResolvedValueOnce({
        // Cor fora do formato #RRGGBB: schema deve rejeitar.
        content: [{ type: 'tool_use', input: { ...estiloValido, paleta: { ...estiloValido.paleta, primaria: 'azul' } } }],
        usage: { input_tokens: 10, output_tokens: 5 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', input: estiloValido }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

    const resultado = await gerarEstilo({ texto: 'moderno', segmento: 'servicos', referencia: null });

    expect(resultado).toEqual(estiloValido);
    expect(mensagensCreateMock).toHaveBeenCalledTimes(2);
  });
});
