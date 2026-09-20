'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

export async function tentarNovamente(empresaId: string): Promise<void> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  await supabase
    .from('fonte_dados')
    .update({ status: 'pendente' })
    .eq('empresa_id', empresaId)
    .eq('status', 'erro');

  redirect(`/empresa/${empresaId}`);
}
