import { z } from 'zod';

export const segmentoSchema = z.enum(['servicos', 'comercio', 'alimentacao', 'outro']);
export type Segmento = z.infer<typeof segmentoSchema>;

export const diaSemanaSchema = z.enum(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']);

const servicoSchema = z.object({
  nome: z.string(),
  descricao: z.string().nullable(),
});

const contatoSchema = z.object({
  whatsapp: z.string().nullable(),
  telefone: z.string().nullable(),
  email: z.string().nullable(),
  instagram: z.string().nullable(),
  site: z.string().nullable(),
});

const enderecoSchema = z.object({
  texto: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

const horarioSchema = z.object({
  dia: diaSemanaSchema,
  abre: z.string(),
  fecha: z.string(),
});

const midiaSchema = z.object({
  logo: z.string().nullable(),
  fotos: z.array(z.string()),
});

const avaliacaoSchema = z.object({
  autor: z.string(),
  texto: z.string(),
  origem: z.string(),
});

const provaSocialSchema = z.object({
  nota: z.number().nullable(),
  total_avaliacoes: z.number().nullable(),
  avaliacoes: z.array(avaliacaoSchema),
});

// Saída da IA estruturadora (7.1) e dos conectores — seção 6 do CLAUDE.md.
export const empresaNormalizadaSchema = z.object({
  nome: z.string(),
  segmento: segmentoSchema,
  descricao_curta: z.string().nullable(),
  servicos: z.array(servicoSchema),
  contato: contatoSchema,
  endereco: enderecoSchema,
  horarios: z.array(horarioSchema),
  midia: midiaSchema,
  prova_social: provaSocialSchema,
});

export type EmpresaNormalizada = z.infer<typeof empresaNormalizadaSchema>;

export const tipoFonteCampoSchema = z.enum(['google', 'instagram', 'manual']);
export const confiancaSchema = z.enum(['alta', 'media', 'baixa']);
export type Confianca = z.infer<typeof confiancaSchema>;

const origemConfiancaItemSchema = z.object({
  fonte: tipoFonteCampoSchema,
  confianca: confiancaSchema,
});

// Mapa "caminho.do.campo" -> { fonte, confianca }, um item por caminho
// efetivamente preenchido em EmpresaNormalizada (não precisa cobrir campos
// nulos/vazios).
export const origemEConfiancaSchema = z.record(z.string(), origemConfiancaItemSchema);

export type OrigemEConfianca = z.infer<typeof origemEConfiancaSchema>;

export const resultadoEstruturadorSchema = z.object({
  empresa: empresaNormalizadaSchema,
  origem_e_confianca: origemEConfiancaSchema,
});

export type ResultadoEstruturador = z.infer<typeof resultadoEstruturadorSchema>;
