import { z } from 'zod';

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.').max(100, 'Nome muito longo.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(254, 'E-mail muito longo.'),
  senha: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(72, 'A senha deve ter no máximo 72 caracteres.'),
  // FormData.get() devolve `null` (não `undefined`) quando o checkbox não é
  // marcado — `.nullish()` cobre os dois casos e deixa o refine rodar.
  aceitouLgpd: z
    .string()
    .nullish()
    .refine((valor) => valor === 'on', {
      message: 'É necessário aceitar os termos de privacidade.',
    }),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(254, 'E-mail muito longo.'),
  senha: z.string().min(1, 'Informe sua senha.').max(72, 'Senha muito longa.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
