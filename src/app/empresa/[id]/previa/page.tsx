import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { z } from 'zod';
import { criarClienteServidor } from '@/lib/supabase/server';
import { calcularValoresEfetivos, montarEmpresaNormalizada } from '@/lib/conectores/normalizador';
import { estiloConfigSchema, conteudoSiteSchema, secaoSchema } from '@/lib/schemas/estilo';
import { resolverSecoes } from '@/lib/site/templates';
import { CLASSE_FONTES_DO_SITE } from '@/lib/site/fontes';
import { SiteRenderer } from '@/components/site/SiteRenderer';
import { PreviaResponsiva } from './PreviaResponsiva';

export const metadata: Metadata = {
  title: 'Prévia do site — SiteLink',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PreviaPage({ params }: PageProps<'/empresa/[id]/previa'>) {
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

  const { data: empresaRow, error: erroEmpresa } = await supabase
    .from('empresa')
    .select('id')
    .eq('id', id)
    .single();
  if (erroEmpresa || !empresaRow) {
    notFound();
  }

  const { data: site } = await supabase
    .from('site')
    .select('id')
    .eq('empresa_id', id)
    .limit(1)
    .maybeSingle();
  if (!site) {
    redirect(`/empresa/${id}/estilo`);
  }

  const { data: versao } = await supabase
    .from('versao_site')
    .select('template_id, estilo_config, conteudo')
    .eq('site_id', site.id)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!versao) {
    redirect(`/empresa/${id}/estilo`);
  }

  const estilo = estiloConfigSchema.parse(versao.estilo_config);
  const conteudo = conteudoSiteSchema.parse(versao.conteudo);

  const template = versao.template_id
    ? (
        await supabase
          .from('template')
          .select('componentes')
          .eq('id', versao.template_id)
          .maybeSingle()
      ).data
    : null;
  const componentesTemplate = z.array(secaoSchema).parse(template?.componentes ?? []);
  const secoes = resolverSecoes(componentesTemplate, estilo.secoes);

  const { data: linhas } = await supabase
    .from('campo_extraido')
    .select('campo, valor, origem, confianca, editado_pelo_usuario')
    .eq('empresa_id', id)
    .order('criado_em', { ascending: true });
  const empresa = montarEmpresaNormalizada(calcularValoresEfetivos(linhas ?? []));

  const { data: fontes } = await supabase
    .from('fonte_dados')
    .select('tipo, url')
    .eq('empresa_id', id);
  const linkOrigem = fontes?.find((fonte) => fonte.tipo !== 'manual' && fonte.url)?.url ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 pt-16 text-center">
        <h1 className="text-2xl font-semibold">Prévia do seu site</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          A edição direta e o ajuste por texto chegam numa próxima fase.
        </p>
        <a
          href={`/empresa/${id}/estilo`}
          className="mx-auto mt-2 text-sm text-gray-600 underline underline-offset-2 dark:text-gray-400"
        >
          Pedir um novo estilo
        </a>
      </div>
      <PreviaResponsiva>
        <div className={CLASSE_FONTES_DO_SITE}>
          <SiteRenderer dados={{ empresa, conteudo, estilo, linkOrigem }} secoes={secoes} />
        </div>
      </PreviaResponsiva>
    </main>
  );
}
