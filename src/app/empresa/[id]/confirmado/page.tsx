import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Dados confirmados — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConfirmadoPage({ params }: PageProps<'/empresa/[id]/confirmado'>) {
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

  const { data: empresa, error: erroEmpresa } = await supabase
    .from('empresa')
    .select('id, declaracao_titularidade_em')
    .eq('id', id)
    .single();

  if (erroEmpresa || !empresa || !empresa.declaracao_titularidade_em) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Dados confirmados!</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        A geração do site (escolha de estilo e prévia) será implementada na próxima fase.
      </p>
    </main>
  );
}
