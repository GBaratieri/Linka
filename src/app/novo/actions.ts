'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { criarEmpresaComLink, criarEmpresaManual } from '@/lib/conectores/criarEmpresa';

export interface EstadoNovo {
  erro?: string;
}

export async function acaoLink(
  _estadoAnterior: EstadoNovo,
  formData: FormData,
): Promise<EstadoNovo> {
  const link = String(formData.get('link') ?? '').trim();
  if (!link) {
    return { erro: 'Cole um link do Instagram ou do Google.' };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resultado = await criarEmpresaComLink(supabase, user.id, link);

  if (!resultado.sucesso) {
    return { erro: resultado.erro };
  }

  redirect(`/empresa/${resultado.empresaId}`);
}

export async function acaoManual(): Promise<EstadoNovo> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resultado = await criarEmpresaManual(supabase, user.id);

  if (!resultado.sucesso) {
    return { erro: resultado.erro };
  }

  redirect(`/empresa/${resultado.empresaId}`);
}
