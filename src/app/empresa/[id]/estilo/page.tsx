import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormularioEstilo } from './FormularioEstilo';

export const metadata: Metadata = {
  title: 'Estilo do site — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EstiloPage({ params }: PageProps<'/empresa/[id]/estilo'>) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: empresa, error } = await supabase
    .from('empresa')
    .select('id, declaracao_titularidade_em')
    .eq('id', id)
    .single();

  if (error || !empresa) {
    notFound();
  }

  // Só faz sentido gerar o site depois que a revisão dos dados extraídos já
  // foi confirmada — sem isso, redireciona pro fluxo normal de onboarding.
  if (!empresa.declaracao_titularidade_em) {
    redirect(`/empresa/${id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Como você quer o visual do seu site?</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Descreva em poucas palavras, ou escolha uma das sugestões abaixo.
        </p>
      </div>
      <FormularioEstilo empresaId={id} />
    </main>
  );
}
