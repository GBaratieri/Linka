'use server';

import { redirect } from 'next/navigation';
import { cadastroSchema } from '@/lib/schemas/auth';
import { criarClienteServidor } from '@/lib/supabase/server';

export interface EstadoCadastro {
  erro?: string;
}

export async function cadastrar(
  _estadoAnterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const resultado = cadastroSchema.safeParse({
    nome: formData.get('nome'),
    email: formData.get('email'),
    senha: formData.get('senha'),
    aceitouLgpd: formData.get('aceitouLgpd'),
  });

  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: resultado.data.email,
    password: resultado.data.senha,
    options: {
      data: {
        nome: resultado.data.nome,
        aceitou_lgpd: true,
      },
    },
  });

  if (error) {
    return { erro: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' };
  }

  // Sem sessão = o projeto Supabase exige confirmação por e-mail antes do
  // primeiro login.
  if (!data.session) {
    redirect('/login?cadastro=pendente');
  }

  redirect('/novo');
}
