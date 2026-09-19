import { z } from 'zod';

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  aceitouLgpd: z
    .string()
    .optional()
    .refine((valor) => valor === 'on', {
      message: 'É necessário aceitar os termos de privacidade.',
    }),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe sua senha.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
