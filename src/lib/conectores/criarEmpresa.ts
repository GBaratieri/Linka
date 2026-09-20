import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { detectarFonte } from './roteador';
import type { TipoFonteDados } from './tipos';

export type ResultadoCriarEmpresa =
  { sucesso: true; empresaId: string } | { sucesso: false; erro: string };

const ERRO_GENERICO_EMPRESA = 'Não foi possível criar a empresa. Tente novamente.';
const ERRO_GENERICO_FONTE = 'Não foi possível registrar a fonte de dados. Tente novamente.';

async function criarEmpresaComFonte(
  supabase: SupabaseClient<Database>,
  usuarioId: string,
  tipo: TipoFonteDados,
  url: string | null,
): Promise<ResultadoCriarEmpresa> {
  const { data: empresa, error: erroEmpresa } = await supabase
    .from('empresa')
    .insert({ usuario_id: usuarioId })
    .select('id')
    .single();

  if (erroEmpresa || !empresa) {
    return { sucesso: false, erro: ERRO_GENERICO_EMPRESA };
  }

  const { error: erroFonte } = await supabase.from('fonte_dados').insert({
    empresa_id: empresa.id,
    tipo,
    url,
    status: 'pendente',
  });

  if (erroFonte) {
    // Sem isso, a empresa fica órfã (sem fonte_dados) e cada nova tentativa
    // do usuário cria outra órfã, já que o insert acima já foi confirmado.
    await supabase.from('empresa').delete().eq('id', empresa.id);
    return { sucesso: false, erro: ERRO_GENERICO_FONTE };
  }

  const { error: erroEvento } = await supabase.from('evento_produto').insert({
    empresa_id: empresa.id,
    tipo: 'link_colado',
    payload: { fonte: tipo, url },
  });

  if (erroEvento) {
    // Métrica de pesquisa (seção 9 do CLAUDE.md), não deve bloquear o
    // usuário — mas a falha precisa ficar visível em algum lugar.
    console.error('Falha ao registrar evento_produto "link_colado":', erroEvento);
  }

  return { sucesso: true, empresaId: empresa.id };
}

export async function criarEmpresaComLink(
  supabase: SupabaseClient<Database>,
  usuarioId: string,
  link: string,
): Promise<ResultadoCriarEmpresa> {
  const fonte = detectarFonte(link);
  if (!fonte.tipo) {
    return { sucesso: false, erro: fonte.erro };
  }

  return criarEmpresaComFonte(supabase, usuarioId, fonte.tipo, fonte.url);
}

export function criarEmpresaManual(
  supabase: SupabaseClient<Database>,
  usuarioId: string,
): Promise<ResultadoCriarEmpresa> {
  return criarEmpresaComFonte(supabase, usuarioId, 'manual', null);
}
