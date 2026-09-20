'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { adicionarFonteComLink, adicionarFonteManual } from '@/lib/conectores/adicionarFonte';

export interface EstadoAdicionarFonte {
  erro?: string;
}

export async function acaoAdicionarLink(
  empresaId: string,
  _estadoAnterior: EstadoAdicionarFonte,
  formData: FormData,
): Promise<EstadoAdicionarFonte> {
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

  const resultado = await adicionarFonteComLink(supabase, empresaId, link);
  if (!resultado.sucesso) {
    return { erro: resultado.erro };
  }

  redirect(`/empresa/${empresaId}`);
}

export async function acaoAdicionarManual(
  empresaId: string,
): Promise<EstadoAdicionarFonte> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const resultado = await adicionarFonteManual(supabase, empresaId);
  if (!resultado.sucesso) {
    return { erro: resultado.erro };
  }

  redirect(`/empresa/${empresaId}`);
}
