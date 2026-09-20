import { z } from 'zod';
import { segmentoSchema, diaSemanaSchema } from './empresa';

const campoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable();

export const horarioFormularioSchema = z.object({
  dia: diaSemanaSchema,
  abre: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  fecha: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
});

export const formularioManualSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da empresa.').max(100),
  segmento: segmentoSchema,
  descricao: campoOpcional(500),
  telefone: campoOpcional(30),
  whatsapp: campoOpcional(30),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .refine((valor) => valor === null || z.email().safeParse(valor).success, 'E-mail inválido.'),
  instagram: campoOpcional(100),
  site: campoOpcional(300),
  endereco: campoOpcional(300),
  servicos: campoOpcional(1000), // uma linha por serviço
  horarios: z.array(horarioFormularioSchema).length(7),
});

export type FormularioManualInput = z.infer<typeof formularioManualSchema>;

export const formularioInstagramSchema = z.object({
  bio: campoOpcional(2000),
  telefoneOuWhatsapp: campoOpcional(30),
});

export type FormularioInstagramInput = z.infer<typeof formularioInstagramSchema>;
