import { afterEach, describe, expect, it, vi } from 'vitest';
import { estruturarEmpresa } from '@/lib/ia/estruturador';
import { resultadoEstruturadorSchema } from '@/lib/schemas/empresa';
import type { DadosBrutosGoogle } from '@/lib/conectores/google';
import type { DadosBrutosInstagram } from '@/lib/conectores/instagram';

const { mensagensCreateMock } = vi.hoisted(() => ({ mensagensCreateMock: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  // Precisa ser uma função "de verdade" (não arrow function): o código
  // instancia com `new Anthropic(...)`, e só uma função construtível que
  // retorna um objeto explicitamente substitui o `this` por esse retorno.
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mensagensCreateMock } };
  }),
}));

const DADOS_GOOGLE: DadosBrutosGoogle = {
  id: 'place-1',
  nome: 'Padaria Pão Quente',
  endereco: 'Rua das Flores, 123',
  telefone: '(11) 3456-7890',
  site: null,
  horarios: ['segunda-feira: 06:00 – 20:00', 'sábado: 06:00 – 14:00'],
  categoriaPrincipal: 'Padaria',
  nota: 4.6,
  totalAvaliacoes: 128,
  lat: -23.55,
  lng: -46.63,
  avaliacoes: null,
  fotos: null,
};

const DADOS_INSTAGRAM: DadosBrutosInstagram = {
  handle: 'salao.bela_hair',
  bio: 'Salão de beleza e cabelo em Curitiba. Agende pelo WhatsApp!',
  telefoneOuWhatsapp: '(41) 99888-7766',
  fotos: ['https://exemplo.com/foto1.jpg'],
};

describe('estruturarEmpresa (USE_MOCKS=true)', () => {
  it('estrutura dados do Google sem inventar campos ausentes', async () => {
    const resultado = await estruturarEmpresa({ origem: 'google', dadosBrutos: DADOS_GOOGLE });

    expect(resultadoEstruturadorSchema.safeParse(resultado).success).toBe(true);
    expect(resultado.empresa.nome).toBe('Padaria Pão Quente');
    expect(resultado.empresa.segmento).toBe('alimentacao');
    expect(resultado.empresa.endereco.texto).toBe(DADOS_GOOGLE.endereco);
    expect(resultado.empresa.contato.telefone).toBe(DADOS_GOOGLE.telefone);
    // Nunca inventar: sem site nos dados brutos, o campo fica null.
    expect(resultado.empresa.contato.site).toBeNull();
    expect(resultado.empresa.contato.whatsapp).toBeNull();
    expect(resultado.empresa.descricao_curta).toBeNull();
    expect(resultado.origem_e_confianca['contato.telefone']).toEqual({
      fonte: 'google',
      confianca: 'alta',
    });
  });

  it('converte os horários do Google para o formato estruturado', async () => {
    const resultado = await estruturarEmpresa({ origem: 'google', dadosBrutos: DADOS_GOOGLE });

    expect(resultado.empresa.horarios).toEqual(
      expect.arrayContaining([
        { dia: 'seg', abre: '06:00', fecha: '20:00' },
        { dia: 'sab', abre: '06:00', fecha: '14:00' },
      ]),
    );
  });

  it('captura os dois intervalos de um dia com horário de almoço', async () => {
    const resultado = await estruturarEmpresa({
      origem: 'google',
      dadosBrutos: {
        ...DADOS_GOOGLE,
        horarios: ['segunda-feira: 08:00 – 12:00, 14:00 – 18:00'],
      },
    });

    expect(resultado.empresa.horarios).toEqual([
      { dia: 'seg', abre: '08:00', fecha: '12:00' },
      { dia: 'seg', abre: '14:00', fecha: '18:00' },
    ]);
  });

  it('não inventa um nome quando o Google não informa nenhum', async () => {
    const resultado = await estruturarEmpresa({
      origem: 'google',
      dadosBrutos: { ...DADOS_GOOGLE, nome: null },
    });

    expect(resultado.empresa.nome).toBe('');
    expect(resultado.origem_e_confianca.nome).toBeUndefined();
  });

  it('estrutura dados do Instagram usando só o que foi informado', async () => {
    const resultado = await estruturarEmpresa({
      origem: 'instagram',
      dadosBrutos: DADOS_INSTAGRAM,
    });

    expect(resultadoEstruturadorSchema.safeParse(resultado).success).toBe(true);
    expect(resultado.empresa.segmento).toBe('servicos');
    expect(resultado.empresa.contato.whatsapp).toBe(DADOS_INSTAGRAM.telefoneOuWhatsapp);
    expect(resultado.empresa.contato.instagram).toBe(DADOS_INSTAGRAM.handle);
    expect(resultado.empresa.midia.fotos).toEqual(DADOS_INSTAGRAM.fotos);
    // Sem endereço nos dados do Instagram: nunca inventar.
    expect(resultado.empresa.endereco.texto).toBeNull();
    expect(resultado.origem_e_confianca['contato.whatsapp']).toEqual({
      fonte: 'instagram',
      confianca: 'alta',
    });
  });

  it('não inventa nome/handle quando o Instagram não tem um usuário identificável', async () => {
    const resultado = await estruturarEmpresa({
      origem: 'instagram',
      dadosBrutos: { ...DADOS_INSTAGRAM, handle: null },
    });

    expect(resultado.empresa.nome).toBe('');
    expect(resultado.empresa.contato.instagram).toBeNull();
    expect(resultado.origem_e_confianca.nome).toBeUndefined();
    expect(resultado.origem_e_confianca['contato.instagram']).toBeUndefined();
  });

  it('nunca preenche endereço a partir de dados do Instagram sem endereço', async () => {
    const resultado = await estruturarEmpresa({
      origem: 'instagram',
      dadosBrutos: { ...DADOS_INSTAGRAM, bio: 'Fazemos entregas em toda a cidade!' },
    });

    expect(resultado.empresa.endereco).toEqual({ texto: null, lat: null, lng: null });
    expect(resultado.origem_e_confianca['endereco.texto']).toBeUndefined();
  });
});

describe('estruturarEmpresa (USE_MOCKS=false, com o SDK da Anthropic mockado)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mensagensCreateMock.mockReset();
  });

  it('reporta o uso de tokens da primeira chamada mesmo quando a segunda tentativa lança um erro', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-sonnet-5');
    vi.stubEnv('ANTHROPIC_API_KEY', 'chave-de-teste');

    mensagensCreateMock
      // Primeira tentativa: responde, mas com saída que não bate com o schema.
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', input: { empresa: {} } }],
        usage: { input_tokens: 100, output_tokens: 20 },
      })
      // Segunda tentativa (retry): a própria chamada falha, não só o schema.
      .mockRejectedValueOnce(new Error('limite de taxa excedido'));

    const usos: Array<{ modelo: string; tokensEntrada: number; tokensSaida: number }> = [];

    await expect(
      estruturarEmpresa({
        origem: 'google',
        dadosBrutos: DADOS_GOOGLE,
        aoUsarIA: (uso) => usos.push(uso),
      }),
    ).rejects.toThrow('limite de taxa excedido');

    // Os tokens da primeira chamada (que teve resposta e foi cobrada) não
    // podem ser perdidos só porque a segunda tentativa lançou um erro.
    expect(usos).toEqual([{ modelo: 'claude-sonnet-5', tokensEntrada: 100, tokensSaida: 20 }]);
  });
});
