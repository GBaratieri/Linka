import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { InstagramFallbackForm } from './InstagramFallbackForm';

export const metadata: Metadata = {
  title: 'Complete os dados do Instagram — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InstagramFallbackPage({
  params,
}: PageProps<'/empresa/[id]/instagram'>) {
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
    .select('id, status, url')
    .eq('empresa_id', id)
    .eq('tipo', 'instagram')
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();

  if (erroFonte || !fonte || !fonte.url) {
    notFound();
  }

  if (fonte.status !== 'nao_configurado') {
    redirect(`/empresa/${id}/revisao`);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Ainda não lemos o Instagram automaticamente</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cole a bio do seu perfil, informe um telefone ou WhatsApp e envie algumas fotos — usamos
          só o que você mandar aqui, nada é inventado.
        </p>
      </div>
      <InstagramFallbackForm empresaId={id} fonteId={fonte.id} fonteUrl={fonte.url} />
    </main>
  );
}
