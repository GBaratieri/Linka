import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { calcularValoresEfetivos } from '@/lib/conectores/normalizador';
import { encontrarDivergencias } from '@/lib/consistencia/comparador';
import { RevisaoForm } from './RevisaoForm';

export const metadata: Metadata = {
  title: 'Revisar dados — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RevisaoPage({ params }: PageProps<'/empresa/[id]/revisao'>) {
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

  // Pode haver mais de uma linha por campo (uma por origem, ex.: Google e
  // Instagram) desde que passou a ser possível complementar a extração com
  // outra fonte depois da revisão — ver /empresa/[id]/adicionar-fonte. A
  // ordem por criado_em garante que o desempate de calcularValoresEfetivos
  // ("empatado, a mais recente vence") funcione corretamente.
  const { data: linhas } = await supabase
    .from('campo_extraido')
    .select('campo, valor, origem, confianca, editado_pelo_usuario')
    .eq('empresa_id', id)
    .order('criado_em', { ascending: true });

  const campos = [...calcularValoresEfetivos(linhas ?? []).values()];
  const divergencias = encontrarDivergencias(linhas ?? []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Revise os dados da sua empresa</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Confira o que encontramos. Campos com confiança baixa merecem uma olhada extra — edite o
          que precisar antes de confirmar.
        </p>
      </div>
      <RevisaoForm empresaId={id} campos={campos} divergencias={divergencias} />
    </main>
  );
}
