'use server';

import { redirect } from 'next/navigation';
import { formularioManualSchema } from '@/lib/schemas/manual';
import { criarClienteServidor } from '@/lib/supabase/server';
import { gravarDadosManual } from '@/lib/conectores/manual';
import { enviarFotos } from '@/lib/conectores/uploadFotos';

export interface EstadoManual {
  erro?: string;
}

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const;

export async function salvarManual(
  empresaId: string,
  fonteId: string,
  _estadoAnterior: EstadoManual,
  formData: FormData,
): Promise<EstadoManual> {
  const horarios = DIAS.map((dia) => ({
    dia,
    abre: (formData.get(`abre_${dia}`) as string) || null,
    fecha: (formData.get(`fecha_${dia}`) as string) || null,
  }));

  const resultado = formularioManualSchema.safeParse({
    nome: formData.get('nome'),
    segmento: formData.get('segmento'),
    descricao: formData.get('descricao'),
    telefone: formData.get('telefone'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email'),
    instagram: formData.get('instagram'),
    site: formData.get('site'),
    endereco: formData.get('endereco'),
    servicos: formData.get('servicos'),
    horarios,
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

  try {
    await gravarDadosManual(supabase, empresaId, fonteId, resultado.data, uploadResultado.urls);
  } catch (erro) {
    console.error('Falha ao gravar dados do formulário manual:', erro);
    return { erro: 'Não foi possível salvar os dados agora. Tente novamente em instantes.' };
  }

  redirect(`/empresa/${empresaId}/revisao`);
}
