import { notFound, redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmpresaPage({ params }: PageProps<'/empresa/[id]'>) {
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
    .select('id')
    .eq('id', id)
    .single();

  if (erroEmpresa || !empresa) {
    notFound();
  }

  const { data: fontes } = await supabase
    .from('fonte_dados')
    .select('id, tipo, status, url')
    .eq('empresa_id', id)
    .order('criado_em', { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Empresa criada</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        ID: <code>{empresa.id}</code>
      </p>
      <ul className="flex flex-col gap-2">
        {fontes?.map((fonte) => (
          <li
            key={fonte.id}
            className="rounded-md border border-gray-200 px-4 py-3 text-sm dark:border-gray-800"
          >
            <p>Fonte: {fonte.tipo}</p>
            <p>Status: {fonte.status}</p>
            {fonte.url ? <p className="truncate text-gray-500">{fonte.url}</p> : null}
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-500">
        A extração automática dos dados será implementada na próxima fase.
      </p>
    </main>
  );
}
