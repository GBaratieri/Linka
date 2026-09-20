import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  resultadoEstruturadorSchema,
  type ResultadoEstruturador,
  type OrigemEConfianca,
  type Segmento,
} from '@/lib/schemas/empresa';
import type { DadosBrutosGoogle } from '@/lib/conectores/google';
import type { DadosBrutosInstagram } from '@/lib/conectores/instagram';

export interface EntradaEstruturador {
  origem: 'google' | 'instagram';
  dadosBrutos: DadosBrutosGoogle | DadosBrutosInstagram;
}

const usarMocks = () => process.env.USE_MOCKS !== 'false';

const PROMPT_SISTEMA = `Você é o estruturador de dados do SiteLink, uma plataforma que gera sites para microempresas brasileiras a partir de dados do Google ou do Instagram.

Regras inegociáveis:
- Use SOMENTE informações presentes nos dados brutos fornecidos pelo usuário.
- Se uma informação não estiver nos dados, o valor correspondente deve ser null (ou lista vazia). Nunca invente telefone, endereço, preço, horário, avaliação ou qualquer outro dado.
- Classifique "segmento" (servicos, comercio, alimentacao ou outro) a partir do conteúdo real dos dados.
- Para cada campo que você preencher (não nulo e não vazio), registre em origem_e_confianca o caminho do campo (ex.: "contato.telefone", "endereco.texto", "servicos.0.nome") com a fonte informada e um nível de confiança: alta (valor exato e explícito nos dados), media (inferido de um texto claro) ou baixa (inferido de um texto ambíguo ou incompleto).`;

const NOME_FERRAMENTA = 'estruturar_empresa';

function ferramentaEstruturador(): Anthropic.Tool {
  const schemaJson = z.toJSONSchema(resultadoEstruturadorSchema) as Record<string, unknown>;
  delete schemaJson.$schema;
  return {
    name: NOME_FERRAMENTA,
    description: 'Estrutura os dados brutos de uma empresa no formato normalizado do SiteLink.',
    input_schema: schemaJson as Anthropic.Tool.InputSchema,
  };
}

export async function estruturarEmpresa(
  entrada: EntradaEstruturador,
): Promise<ResultadoEstruturador> {
  if (usarMocks()) {
    return estruturarComFixture(entrada);
  }
  return estruturarComIA(entrada);
}

async function estruturarComIA(entrada: EntradaEstruturador): Promise<ResultadoEstruturador> {
  const modelo = process.env.ANTHROPIC_MODEL;
  if (!modelo) {
    throw new Error('ANTHROPIC_MODEL não configurado.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const chamar = () =>
    client.messages.create({
      model: modelo,
      max_tokens: 4096,
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: 'user',
          content: `Fonte: ${entrada.origem}\n\nDados brutos:\n${JSON.stringify(entrada.dadosBrutos, null, 2)}`,
        },
      ],
      tools: [ferramentaEstruturador()],
      tool_choice: { type: 'tool', name: NOME_FERRAMENTA },
    });

  const extrairResultado = (resposta: Anthropic.Message) => {
    const usoDeFerramenta = resposta.content.find(
      (bloco): bloco is Anthropic.ToolUseBlock => bloco.type === 'tool_use',
    );
    return resultadoEstruturadorSchema.safeParse(usoDeFerramenta?.input);
  };

  let resultado = extrairResultado(await chamar());
  if (!resultado.success) {
    // Uma nova tentativa se a saída vier inválida (comportamento da IA, seção 7 do CLAUDE.md).
    resultado = extrairResultado(await chamar());
  }

  if (!resultado.success) {
    throw new Error(
      'Não foi possível estruturar os dados da empresa agora. Tente novamente em instantes.',
    );
  }

  return resultado.data;
}

// --- Modo mock (USE_MOCKS=true): heurísticas determinísticas, sem chamar a IA ---

const PALAVRAS_ALIMENTACAO = [
  'restaurante',
  'lanchonete',
  'pizza',
  'pizzaria',
  'padaria',
  'confeitaria',
  'cafeteria',
  'café',
  'comida',
  'hamburgueria',
  'churrascaria',
];
const PALAVRAS_SERVICOS = [
  'salão',
  'salao',
  'cabelo',
  'estética',
  'estetica',
  'barbearia',
  'manicure',
  'consultoria',
  'clínica',
  'clinica',
  'academia',
];
const PALAVRAS_COMERCIO = [
  'loja',
  'moda',
  'roupa',
  'boutique',
  'mercado',
  'papelaria',
  'móveis',
  'moveis',
];

function classificarSegmentoPorTexto(texto: string | null): Segmento {
  const alvo = (texto ?? '').toLowerCase();
  if (PALAVRAS_ALIMENTACAO.some((p) => alvo.includes(p))) return 'alimentacao';
  if (PALAVRAS_SERVICOS.some((p) => alvo.includes(p))) return 'servicos';
  if (PALAVRAS_COMERCIO.some((p) => alvo.includes(p))) return 'comercio';
  return 'outro';
}

const DIAS_SEMANA_PT: Record<string, string> = {
  'segunda-feira': 'seg',
  'terça-feira': 'ter',
  'quarta-feira': 'qua',
  'quinta-feira': 'qui',
  'sexta-feira': 'sex',
  sábado: 'sab',
  domingo: 'dom',
};

function converterHorariosGoogle(
  linhas: string[] | null,
): ResultadoEstruturador['empresa']['horarios'] {
  if (!linhas) return [];

  const horarios: ResultadoEstruturador['empresa']['horarios'] = [];
  for (const linha of linhas) {
    const separador = linha.indexOf(':');
    if (separador === -1) continue;

    const nomeDia = linha.slice(0, separador).trim().toLowerCase();
    const resto = linha.slice(separador + 1).trim();
    const dia = DIAS_SEMANA_PT[nomeDia];
    const horas = resto.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
    if (dia && horas) {
      horarios.push({
        dia: dia as (typeof horarios)[number]['dia'],
        abre: horas[1],
        fecha: horas[2],
      });
    }
  }
  return horarios;
}

function formatarHandle(handle: string): string {
  return handle
    .replace(/^@/, '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function estruturarGoogleComFixture(dados: DadosBrutosGoogle): ResultadoEstruturador {
  const origemEConfianca: OrigemEConfianca = {};
  const marcar = (caminho: string, confianca: 'alta' | 'media' | 'baixa') => {
    origemEConfianca[caminho] = { fonte: 'google', confianca };
  };

  if (dados.endereco) marcar('endereco.texto', 'alta');
  if (dados.lat !== null) marcar('endereco.lat', 'alta');
  if (dados.lng !== null) marcar('endereco.lng', 'alta');
  if (dados.telefone) marcar('contato.telefone', 'alta');
  if (dados.site) marcar('contato.site', 'alta');
  if (dados.horarios?.length) marcar('horarios', 'media');
  if (dados.nota !== null) marcar('prova_social.nota', 'alta');
  if (dados.totalAvaliacoes !== null) marcar('prova_social.total_avaliacoes', 'alta');
  if (dados.nome) marcar('nome', 'alta');
  marcar('segmento', dados.categoriaPrincipal ? 'media' : 'baixa');

  return {
    empresa: {
      nome: dados.nome ?? 'Empresa sem nome no Google',
      segmento: classificarSegmentoPorTexto(dados.categoriaPrincipal),
      descricao_curta: null,
      servicos: [],
      contato: {
        whatsapp: null,
        telefone: dados.telefone,
        email: null,
        instagram: null,
        site: dados.site,
      },
      endereco: { texto: dados.endereco, lat: dados.lat, lng: dados.lng },
      horarios: converterHorariosGoogle(dados.horarios),
      midia: { logo: null, fotos: dados.fotos ?? [] },
      prova_social: {
        nota: dados.nota,
        total_avaliacoes: dados.totalAvaliacoes,
        avaliacoes: (dados.avaliacoes ?? []).map((avaliacao) => ({
          ...avaliacao,
          origem: 'google',
        })),
      },
    },
    origem_e_confianca: origemEConfianca,
  };
}

function estruturarInstagramComFixture(dados: DadosBrutosInstagram): ResultadoEstruturador {
  const origemEConfianca: OrigemEConfianca = {};
  const marcar = (caminho: string, confianca: 'alta' | 'media' | 'baixa') => {
    origemEConfianca[caminho] = { fonte: 'instagram', confianca };
  };

  marcar('nome', 'baixa');
  marcar('segmento', 'baixa');
  marcar('contato.instagram', 'alta');
  if (dados.bio) marcar('descricao_curta', 'media');
  if (dados.telefoneOuWhatsapp) marcar('contato.whatsapp', 'alta');
  if (dados.fotos.length) marcar('midia.fotos', 'alta');

  return {
    empresa: {
      nome: formatarHandle(dados.handle),
      segmento: classificarSegmentoPorTexto(dados.bio),
      descricao_curta: dados.bio || null,
      servicos: [],
      contato: {
        whatsapp: dados.telefoneOuWhatsapp,
        telefone: null,
        email: null,
        instagram: dados.handle,
        site: null,
      },
      endereco: { texto: null, lat: null, lng: null },
      horarios: [],
      midia: { logo: null, fotos: dados.fotos },
      prova_social: { nota: null, total_avaliacoes: null, avaliacoes: [] },
    },
    origem_e_confianca: origemEConfianca,
  };
}

function estruturarComFixture(entrada: EntradaEstruturador): ResultadoEstruturador {
  if (entrada.origem === 'google') {
    return estruturarGoogleComFixture(entrada.dadosBrutos as DadosBrutosGoogle);
  }
  return estruturarInstagramComFixture(entrada.dadosBrutos as DadosBrutosInstagram);
}
