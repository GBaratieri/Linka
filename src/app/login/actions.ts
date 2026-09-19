'use server';

import { redirect } from 'next/navigation';
import { loginSchema } from '@/lib/schemas/auth';
import { criarClienteServidor } from '@/lib/supabase/server';

export interface EstadoLogin {
  erro?: string;
}

export async function entrar(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const resultado = loginSchema.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
  });

  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.senha,
  });

  if (error) {
    return { erro: 'E-mail ou senha incorretos.' };
  }

  redirect('/novo');
}
