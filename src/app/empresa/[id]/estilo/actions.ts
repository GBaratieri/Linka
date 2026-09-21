'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { pedidoEstiloSchema } from '@/lib/schemas/estilo';
import { gerarNovaVersaoDoSite } from '@/lib/site/geracao';

export interface EstadoEstilo {
  erro?: string;
}

export async function acaoGerarSite(
  empresaId: string,
  _estadoAnterior: EstadoEstilo,
  formData: FormData,
): Promise<EstadoEstilo> {
  const resultado = pedidoEstiloSchema.safeParse({
    texto: formData.get('texto'),
    referencia: formData.get('referencia') || null,
  });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? 'Verifique os dados informados.' };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const geracao = await gerarNovaVersaoDoSite(supabase, empresaId, resultado.data);
  if (!geracao.sucesso) {
    return { erro: geracao.erro };
  }

  redirect(`/empresa/${empresaId}/previa`);
}
