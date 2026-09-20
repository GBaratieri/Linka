import { describe, expect, it } from 'vitest';
import { cadastroSchema, loginSchema } from '@/lib/schemas/auth';

const DADOS_VALIDOS = {
  nome: 'Maria Teste',
  email: 'maria@teste.com',
  senha: 'senha12345',
  aceitouLgpd: 'on',
};

describe('cadastroSchema', () => {
  it('aceita dados válidos com o checkbox marcado', () => {
    expect(cadastroSchema.safeParse(DADOS_VALIDOS).success).toBe(true);
  });

  it('rejeita com a mensagem em pt-BR quando o checkbox vem como null (FormData sem o campo)', () => {
    const resultado = cadastroSchema.safeParse({ ...DADOS_VALIDOS, aceitouLgpd: null });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'É necessário aceitar os termos de privacidade.',
      );
    }
  });

  it('rejeita com a mesma mensagem quando o checkbox vem como undefined', () => {
    const resultado = cadastroSchema.safeParse({ ...DADOS_VALIDOS, aceitouLgpd: undefined });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(
        'É necessário aceitar os termos de privacidade.',
      );
    }
  });

  it('rejeita um nome maior que o limite', () => {
    const resultado = cadastroSchema.safeParse({ ...DADOS_VALIDOS, nome: 'a'.repeat(101) });
    expect(resultado.success).toBe(false);
  });

  it('rejeita uma senha maior que o limite', () => {
    const resultado = cadastroSchema.safeParse({ ...DADOS_VALIDOS, senha: 'a'.repeat(73) });
    expect(resultado.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('aceita e-mail e senha válidos', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', senha: 'qualquer' }).success).toBe(true);
  });

  it('rejeita uma senha maior que o limite', () => {
    const resultado = loginSchema.safeParse({ email: 'a@b.com', senha: 'a'.repeat(73) });
    expect(resultado.success).toBe(false);
  });
});
