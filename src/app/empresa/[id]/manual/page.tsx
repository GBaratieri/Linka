import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { ManualForm } from './ManualForm';

export const metadata: Metadata = {
  title: 'Preencher dados — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ManualPage({ params }: PageProps<'/empresa/[id]/manual'>) {
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

  const { data: fonte, error: erroFonte } = await supabase
    .from('fonte_dados')
    .select('id, tipo, status')
    .eq('empresa_id', id)
    .eq('tipo', 'manual')
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();

  if (erroFonte || !fonte) {
    notFound();
  }

  if (fonte.status !== 'pendente') {
    redirect(`/empresa/${id}/revisao`);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Conte sobre sua empresa</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Preencha o que fizer sentido — nada aqui é inventado por nós, só o que você informar
          aparece no seu site.
        </p>
      </div>
      <ManualForm empresaId={id} fonteId={fonte.id} />
    </main>
  );
}
