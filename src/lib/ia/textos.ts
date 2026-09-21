import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { conteudoSiteSchema, type ConteudoSite } from '@/lib/schemas/estilo';
import type { EmpresaNormalizada } from '@/lib/schemas/empresa';
import type { TomDeVoz } from '@/lib/schemas/estilo';
import type { UsoTokens } from '@/lib/metricas/custos';

export interface EntradaTextos {
  empresa: EmpresaNormalizada;
  cidade: string | null;
  tomDeVoz: TomDeVoz;
  aoUsarIA?: (uso: UsoTokens) => void;
}

const usarMocks = () => process.env.USE_MOCKS !== 'false';

const PROMPT_SISTEMA = `Você redige os textos do site de um cliente do Linka a partir dos dados reais da empresa dele.

Regras inegociáveis:
- Use SOMENTE fatos presentes no JSON da empresa fornecido. Nunca invente telefone, endereço, horário, preço ou qualquer outro dado que não esteja lá.
- Escreva no tom de voz indicado (formal, descontraído, acolhedor, técnico ou premium).
- "titulo_pagina" e "h1" seguem o padrão "{nome da empresa} em {cidade}" quando a cidade for informada; sem cidade, use só o nome da empresa — nunca uma palavra-chave genérica de localização sem cidade real.
- A descrição de cada serviço pode ser redigida de forma atrativa, mas sem inventar preço, prazo ou qualquer detalhe que não esteja nos dados.`;

const NOME_FERRAMENTA = 'gerar_textos';

function ferramentaTextos(): Anthropic.Tool {
  const schemaJson = z.toJSONSchema(conteudoSiteSchema) as Record<string, unknown>;
  delete schemaJson.$schema;
  return {
    name: NOME_FERRAMENTA,
    description: 'Redige os textos do site a partir dos dados reais da empresa.',
    input_schema: schemaJson as Anthropic.Tool.InputSchema,
  };
}

export async function gerarTextos(entrada: EntradaTextos): Promise<ConteudoSite> {
  if (usarMocks()) {
    return gerarTextosComFixture(entrada);
  }
  return gerarTextosComIA(entrada);
}

async function gerarTextosComIA(entrada: EntradaTextos): Promise<ConteudoSite> {
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
      max_tokens: 2048,
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: 'user',
          content: [
            `Cidade: ${entrada.cidade ?? '(não informada)'}`,
            `Tom de voz: ${entrada.tomDeVoz}`,
            `Dados da empresa:\n${JSON.stringify(entrada.empresa, null, 2)}`,
          ].join('\n\n'),
        },
      ],
      tools: [ferramentaTextos()],
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
    return conteudoSiteSchema.safeParse(usoDeFerramenta?.input);
  };

  try {
    let resultado = extrairResultado(await chamar());
    if (!resultado.success) {
      resultado = extrairResultado(await chamar());
    }

    if (!resultado.success) {
      throw new Error('Não foi possível redigir os textos do site agora. Tente novamente em instantes.');
    }

    return resultado.data;
  } finally {
    entrada.aoUsarIA?.({ modelo, tokensEntrada, tokensSaida });
  }
}

// --- Modo mock (USE_MOCKS=true): templates determinísticos por tom de voz ---

const SAUDACAO_POR_TOM: Record<TomDeVoz, (nome: string) => string> = {
  formal: (nome) => `Bem-vindo à ${nome}`,
  descontraido: (nome) => `Ei, que bom te ver por aqui! Essa é a ${nome}`,
  acolhedor: (nome) => `Seja muito bem-vindo à ${nome}`,
  tecnico: (nome) => nome,
  premium: (nome) => nome,
};

const CTA_POR_TOM: Record<TomDeVoz, string> = {
  formal: 'Entre em contato',
  descontraido: 'Chama a gente!',
  acolhedor: 'Vamos conversar?',
  tecnico: 'Solicite um orçamento',
  premium: 'Agende sua experiência',
};

const SEGMENTO_LABEL: Record<EmpresaNormalizada['segmento'], string> = {
  servicos: 'serviços',
  comercio: 'produtos',
  alimentacao: 'sabores',
  outro: 'novidades',
};

function descricaoServicoFixture(nomeServico: string, tom: TomDeVoz): string {
  const modelos: Record<TomDeVoz, string> = {
    formal: `${nomeServico}, realizado com atenção e cuidado profissional.`,
    descontraido: `${nomeServico} do jeito que você gosta, sem enrolação.`,
    acolhedor: `${nomeServico} pensado para o seu bem-estar.`,
    tecnico: `${nomeServico}, com processo padronizado e resultado consistente.`,
    premium: `${nomeServico}, com o cuidado que você merece.`,
  };
  return modelos[tom];
}

function gerarTextosComFixture(entrada: EntradaTextos): ConteudoSite {
  const { empresa, cidade, tomDeVoz } = entrada;
  const segmentoLabel = SEGMENTO_LABEL[empresa.segmento];

  const nomeOuCidade = cidade ? `${empresa.nome} em ${cidade}` : empresa.nome;

  return {
    hero: {
      titulo: SAUDACAO_POR_TOM[tomDeVoz](empresa.nome),
      subtitulo: cidade
        ? `Confira nossos ${segmentoLabel} em ${cidade}.`
        : `Confira nossos ${segmentoLabel}.`,
    },
    sobre: empresa.descricao_curta,
    servicos: empresa.servicos.map((servico) => ({
      nome: servico.nome,
      descricao: servico.descricao ?? descricaoServicoFixture(servico.nome, tomDeVoz),
    })),
    cta_principal: CTA_POR_TOM[tomDeVoz],
    seo: {
      titulo_pagina: nomeOuCidade,
      descricao_pagina: cidade
        ? `${empresa.nome}: ${segmentoLabel} em ${cidade}.`
        : `${empresa.nome}: ${segmentoLabel}.`,
      h1: nomeOuCidade,
    },
  };
}
