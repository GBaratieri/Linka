'use server';

import { redirect } from 'next/navigation';
import { formularioInstagramSchema } from '@/lib/schemas/manual';
import { criarClienteServidor } from '@/lib/supabase/server';
import { processarFallbackInstagram } from '@/lib/conectores/instagram';
import { enviarFotos } from '@/lib/conectores/uploadFotos';

export interface EstadoInstagram {
  erro?: string;
}

export async function salvarFallbackInstagram(
  empresaId: string,
  fonteId: string,
  fonteUrl: string,
  _estadoAnterior: EstadoInstagram,
  formData: FormData,
): Promise<EstadoInstagram> {
  const resultado = formularioInstagramSchema.safeParse({
    bio: formData.get('bio'),
    telefoneOuWhatsapp: formData.get('telefoneOuWhatsapp'),
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

  const arquivos = formData.getAll('fotos').filter((valor): valor is File => valor instanceof File);
  const uploadResultado = await enviarFotos(supabase, empresaId, arquivos);
  if (!uploadResultado.sucesso) {
    return { erro: uploadResultado.erro };
  }

  await processarFallbackInstagram(
    supabase,
    empresaId,
    fonteId,
    fonteUrl,
    resultado.data,
    uploadResultado.urls,
  );

  redirect(`/empresa/${empresaId}/revisao`);
}
