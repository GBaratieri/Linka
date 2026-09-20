import { notFound, redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { processarFonteDados } from '@/lib/conectores/normalizador';
import { tentarNovamente } from './actions';

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

  const { data: fonte, error: erroFonte } = await supabase
    .from('fonte_dados')
    .select('id, tipo, status, url')
    .eq('empresa_id', id)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroFonte || !fonte) {
    notFound();
  }

  let status = fonte.status;

  // Extração síncrona: com USE_MOCKS=true é instantânea; com a Places API
  // real deve levar no máximo alguns segundos. Ver docs/decisoes.md,
  // "Extração síncrona em vez de polling". processarFonteDados devolve o
  // status final diretamente — evita uma segunda consulta ao banco (que
  // poderia falhar/atrasar e deixar "status" preso no valor antigo
  // "pendente", mascarando um erro real já gravado) e evita repetir aqui a
  // suposição de qual status o Instagram sempre resulta.
  if (status === 'pendente' && (fonte.tipo === 'google' || fonte.tipo === 'instagram')) {
    status = await processarFonteDados(supabase, id, fonte);
  }

  if (status === 'erro') {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Não conseguimos extrair os dados</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Não encontramos essa empresa no Google a partir do link informado.
        </p>
        <form action={tentarNovamente.bind(null, id)}>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
          >
            Tentar novamente
          </button>
        </form>
      </main>
    );
  }

  if (status === 'nao_configurado') {
    redirect(`/empresa/${id}/instagram`);
  }

  if (fonte.tipo === 'manual' && status === 'pendente') {
    redirect(`/empresa/${id}/manual`);
  }

  redirect(`/empresa/${id}/revisao`);
}
