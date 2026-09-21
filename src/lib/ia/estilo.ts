import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { estiloConfigSchema, type EstiloConfig } from '@/lib/schemas/estilo';
import type { Segmento } from '@/lib/schemas/empresa';
import type { UsoTokens } from '@/lib/metricas/custos';

export interface EntradaEstilo {
  texto: string;
  segmento: Segmento;
  referencia: string | null;
  // Ver estruturador.ts para o porquê desse callback em vez de gravar no
  // banco direto daqui (mantém a camada de IA sem depender do Supabase).
  aoUsarIA?: (uso: UsoTokens) => void;
}

const usarMocks = () => process.env.USE_MOCKS !== 'false';

const PROMPT_SISTEMA = `Você converte o pedido de estilo visual de um cliente do Linka num objeto de configuração de estilo para o site dele.

Regras inegociáveis:
- Todo valor deve vir das listas permitidas pelo esquema — nunca invente uma cor, fonte ou tom fora do que é aceito.
- "referencia" (quando enviada) é só texto descritivo do que o cliente gostou em outro site — nunca é uma URL para visitar; não tente acessá-la, apenas leve em conta o que ela descreve.
- Escolha uma paleta com contraste alto o bastante entre "texto"/"fundo" e "primaria"/"fundo" para leitura confortável — o servidor ainda corrige automaticamente se não bastar.
- "secoes" deve refletir o que faz sentido para o segmento do negócio.`;

const NOME_FERRAMENTA = 'gerar_estilo';

function ferramentaEstilo(): Anthropic.Tool {
  const schemaJson = z.toJSONSchema(estiloConfigSchema) as Record<string, unknown>;
  delete schemaJson.$schema;
  return {
    name: NOME_FERRAMENTA,
    description: 'Gera a configuração de estilo visual do site a partir do pedido do cliente.',
    input_schema: schemaJson as Anthropic.Tool.InputSchema,
  };
}

export async function gerarEstilo(entrada: EntradaEstilo): Promise<EstiloConfig> {
  if (usarMocks()) {
    return gerarEstiloComFixture(entrada);
  }
  return gerarEstiloComIA(entrada);
}

async function gerarEstiloComIA(entrada: EntradaEstilo): Promise<EstiloConfig> {
  const modelo = process.env.ANTHROPIC_MODEL;
  if (!modelo) {
    throw new Error('ANTHROPIC_MODEL não configurado.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let tokensEntrada = 0;
  let tokensSaida = 0;

  const chamar = async () => {
    const resposta = await client.messages.create({
      model: modelo,
      max_tokens: 1024,
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: 'user',
          content: [
            `Segmento do negócio: ${entrada.segmento}`,
            `Pedido do cliente: ${entrada.texto}`,
            entrada.referencia ? `Referência descrita pelo cliente: ${entrada.referencia}` : null,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
      tools: [ferramentaEstilo()],
      tool_choice: { type: 'tool', name: NOME_FERRAMENTA },
    });
    tokensEntrada += resposta.usage.input_tokens;
    tokensSaida += resposta.usage.output_tokens;
    return resposta;
  };

  const extrairResultado = (resposta: Anthropic.Message) => {
    const usoDeFerramenta = resposta.content.find(
      (bloco): bloco is Anthropic.ToolUseBlock => bloco.type === 'tool_use',
    );
    return estiloConfigSchema.safeParse(usoDeFerramenta?.input);
  };

  try {
    let resultado = extrairResultado(await chamar());
    if (!resultado.success) {
      resultado = extrairResultado(await chamar());
    }

    if (!resultado.success) {
      throw new Error('Não foi possível gerar o estilo do site agora. Tente novamente em instantes.');
    }

    return resultado.data;
  } finally {
    entrada.aoUsarIA?.({ modelo, tokensEntrada, tokensSaida });
  }
}

// --- Modo mock (USE_MOCKS=true): heurísticas determinísticas por palavra-chave ---

const SECOES_POR_SEGMENTO: Record<Segmento, EstiloConfig['secoes']> = {
  servicos: ['hero', 'servicos', 'prova_social', 'sobre', 'localizacao', 'contato', 'faq'],
  comercio: ['hero', 'galeria', 'servicos', 'prova_social', 'sobre', 'localizacao', 'contato'],
  alimentacao: ['hero', 'galeria', 'servicos', 'prova_social', 'localizacao', 'contato', 'faq'],
  outro: ['hero', 'servicos', 'prova_social', 'sobre', 'localizacao', 'contato'],
};

type EstiloBase = Omit<EstiloConfig, 'secoes'>;

const ESTILO_MODERNO: EstiloBase = {
  tema: 'claro',
  paleta: { primaria: '#2563EB', secundaria: '#0EA5E9', fundo: '#FFFFFF', texto: '#0F172A' },
  tipografia: { titulos: 'Inter', corpo: 'Inter' },
  tom_de_voz: 'tecnico',
  densidade: 'media',
  raio_borda: 'medio',
  destaque_cta: 'whatsapp',
};

const ESTILO_ELEGANTE: EstiloBase = {
  tema: 'claro',
  paleta: { primaria: '#8B6F47', secundaria: '#2B2B2B', fundo: '#FAF7F2', texto: '#1C1C1C' },
  tipografia: { titulos: 'Playfair Display', corpo: 'Lora' },
  tom_de_voz: 'premium',
  densidade: 'espacada',
  raio_borda: 'pequeno',
  destaque_cta: 'whatsapp',
};

const ESTILO_DIVERTIDO: EstiloBase = {
  tema: 'claro',
  paleta: { primaria: '#FF6B35', secundaria: '#E6AC00', fundo: '#FFFDF9', texto: '#241623' },
  tipografia: { titulos: 'Poppins', corpo: 'Nunito' },
  tom_de_voz: 'descontraido',
  densidade: 'compacta',
  raio_borda: 'grande',
  destaque_cta: 'whatsapp',
};

const ESTILO_MINIMALISTA: EstiloBase = {
  tema: 'claro',
  paleta: { primaria: '#111111', secundaria: '#4B5563', fundo: '#FFFFFF', texto: '#111111' },
  tipografia: { titulos: 'Montserrat', corpo: 'Inter' },
  tom_de_voz: 'formal',
  densidade: 'espacada',
  raio_borda: 'nenhum',
  destaque_cta: 'telefone',
};

const ESTILO_RUSTICO: EstiloBase = {
  tema: 'claro',
  paleta: { primaria: '#8B5E34', secundaria: '#A9662E', fundo: '#FBF3E7', texto: '#3B2A1A' },
  tipografia: { titulos: 'Merriweather', corpo: 'Lora' },
  tom_de_voz: 'acolhedor',
  densidade: 'media',
  raio_borda: 'medio',
  destaque_cta: 'mapa',
};

// Uma entrada por chip clicável da tela de estilo (seção "Fase 3" do
// CLAUDE.md) — a primeira palavra-chave encontrada no texto vence.
const PALAVRAS_CHAVE_ESTILO: Array<{ palavras: string[]; estilo: EstiloBase }> = [
  { palavras: ['moderno', 'contemporâneo', 'contemporaneo', 'tech', 'tecnológico'], estilo: ESTILO_MODERNO },
  { palavras: ['elegante', 'sofisticado', 'refinado', 'luxo', 'premium'], estilo: ESTILO_ELEGANTE },
  { palavras: ['divertido', 'alegre', 'colorido', 'descontraído', 'descontraido', 'jovem'], estilo: ESTILO_DIVERTIDO },
  { palavras: ['minimalista', 'minimalismo', 'simples', 'clean', 'limpo'], estilo: ESTILO_MINIMALISTA },
  { palavras: ['rústico', 'rustico', 'artesanal', 'caseiro', 'aconchegante'], estilo: ESTILO_RUSTICO },
];

const ESTILO_PADRAO_POR_SEGMENTO: Record<Segmento, EstiloBase> = {
  servicos: ESTILO_MODERNO,
  comercio: ESTILO_MODERNO,
  alimentacao: ESTILO_RUSTICO,
  outro: ESTILO_MODERNO,
};

function escolherEstiloBase(texto: string, segmento: Segmento): EstiloBase {
  const alvo = texto.toLowerCase();
  const combinacao = PALAVRAS_CHAVE_ESTILO.find(({ palavras }) =>
    palavras.some((palavra) => alvo.includes(palavra)),
  );
  return combinacao?.estilo ?? ESTILO_PADRAO_POR_SEGMENTO[segmento];
}

function gerarEstiloComFixture(entrada: EntradaEstilo): EstiloConfig {
  const base = escolherEstiloBase(entrada.texto, entrada.segmento);
  return { ...base, secoes: SECOES_POR_SEGMENTO[entrada.segmento] };
}
