import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormularioAdicionarFonte } from './FormularioAdicionarFonte';

export const metadata: Metadata = {
  title: 'Complementar com outra fonte — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdicionarFontePage({
  params,
}: PageProps<'/empresa/[id]/adicionar-fonte'>) {
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

  if (erroEmpresa || !empresa) {
    notFound();
  }

  // Só faz sentido complementar depois de já ter confirmado a primeira
  // fonte na revisão — antes disso, o fluxo normal de onboarding
  // (/empresa/[id]) já cuida de processar a fonte pendente.
  if (!empresa.declaracao_titularidade_em) {
    redirect(`/empresa/${id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Complemente com outra fonte</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cole o link de outra fonte (ex.: se você já usou o Google, cole agora o Instagram) para
          comparar os dados e destacar o que não bate entre elas.
        </p>
      </div>
      <FormularioAdicionarFonte empresaId={id} />
    </main>
  );
}
