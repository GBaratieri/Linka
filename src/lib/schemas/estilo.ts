import { z } from 'zod';

// Contratos da Fase 3 (seção 7 do CLAUDE.md) — saída da IA de estilo
// (8.2) e da IA de textos (8.3). Todo valor dentro de listas permitidas:
// qualquer valor fora da lista é rejeitado pelo Zod.

export const temaSchema = z.enum(['claro', 'escuro']);
export type Tema = z.infer<typeof temaSchema>;

const corHexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor precisa estar no formato #RRGGBB.');

export const paletaSchema = z.object({
  primaria: corHexSchema,
  secundaria: corHexSchema,
  fundo: corHexSchema,
  texto: corHexSchema,
});
export type Paleta = z.infer<typeof paletaSchema>;

export const fonteTitulosSchema = z.enum([
  'Inter',
  'Poppins',
  'Montserrat',
  'DM Sans',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Nunito',
]);
export type FonteTitulos = z.infer<typeof fonteTitulosSchema>;

export const fonteCorpoSchema = z.enum(['Inter', 'DM Sans', 'Nunito', 'Lora']);
export type FonteCorpo = z.infer<typeof fonteCorpoSchema>;

export const tipografiaSchema = z.object({
  titulos: fonteTitulosSchema,
  corpo: fonteCorpoSchema,
});

export const tomDeVozSchema = z.enum(['formal', 'descontraido', 'acolhedor', 'tecnico', 'premium']);
export type TomDeVoz = z.infer<typeof tomDeVozSchema>;

export const densidadeSchema = z.enum(['compacta', 'media', 'espacada']);
export type Densidade = z.infer<typeof densidadeSchema>;

export const raioBordaSchema = z.enum(['nenhum', 'pequeno', 'medio', 'grande']);
export type RaioBorda = z.infer<typeof raioBordaSchema>;

export const secaoSchema = z.enum([
  'hero',
  'servicos',
  'prova_social',
  'galeria',
  'sobre',
  'localizacao',
  'contato',
  'faq',
]);
export type Secao = z.infer<typeof secaoSchema>;

export const destaqueCtaSchema = z.enum(['whatsapp', 'telefone', 'mapa']);
export type DestaqueCta = z.infer<typeof destaqueCtaSchema>;

export const estiloConfigSchema = z.object({
  tema: temaSchema,
  paleta: paletaSchema,
  tipografia: tipografiaSchema,
  tom_de_voz: tomDeVozSchema,
  densidade: densidadeSchema,
  raio_borda: raioBordaSchema,
  secoes: z.array(secaoSchema).min(1),
  destaque_cta: destaqueCtaSchema,
});
export type EstiloConfig = z.infer<typeof estiloConfigSchema>;

// Entrada da caixa de estilo (tela /empresa/[id]/estilo).
export const pedidoEstiloSchema = z.object({
  texto: z.string().trim().min(1, 'Descreva como você quer o visual do site.').max(500),
  referencia: z.string().trim().max(300).nullable(),
});
export type PedidoEstilo = z.infer<typeof pedidoEstiloSchema>;

// Saída da IA de textos (8.3) — título do hero, subtítulo, descrição de
// serviços, sobre e SEO local, no tom de voz escolhido, só com fatos do
// JSON da empresa (guarda anti-alucinação em ia/guardas.ts).
export const conteudoServicoSchema = z.object({
  nome: z.string(),
  descricao: z.string().nullable(),
});

export const conteudoSiteSchema = z.object({
  hero: z.object({
    titulo: z.string(),
    subtitulo: z.string(),
  }),
  sobre: z.string().nullable(),
  servicos: z.array(conteudoServicoSchema),
  cta_principal: z.string(),
  seo: z.object({
    titulo_pagina: z.string(),
    descricao_pagina: z.string(),
    h1: z.string(),
  }),
});
export type ConteudoSite = z.infer<typeof conteudoSiteSchema>;
