import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { detectarFonte } from './roteador';
import type { TipoFonteDados } from './tipos';

export type ResultadoAdicionarFonte = { sucesso: true } | { sucesso: false; erro: string };

const ERRO_GENERICO_FONTE = 'Não foi possível registrar a fonte de dados. Tente novamente.';

const ERRO_FONTE_DUPLICADA =
  'Essa empresa já tem uma fonte desse tipo. Escolha um tipo diferente para comparar.';

// Código do Postgres para violação de constraint única (unique_violation).
const CODIGO_ERRO_UNICIDADE = '23505';

// Complementa uma empresa já existente com outra fonte (ex.: já tem o
// Google, agora completa com o Instagram) — usado pelo Verificador de
// consistência (Fase 2 do CLAUDE.md v2) para ter algo de verdade para
// comparar entre fontes. Uma empresa só pode ter uma fonte por tipo (pedir
// a mesma fonte de novo não teria dado novo para comparar) — em vez de
// checar isso antes de inserir (o que deixaria uma corrida entre a checagem
// e o insert em envios simultâneos), confia na constraint única do banco
// (fonte_dados_empresa_tipo_key) e trata a violação dela como o erro
// esperado.
async function inserirFonteAdicional(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  tipo: TipoFonteDados,
  url: string | null,
): Promise<ResultadoAdicionarFonte> {
  const { error: erroFonte } = await supabase.from('fonte_dados').insert({
    empresa_id: empresaId,
    tipo,
    url,
    status: 'pendente',
  });

  if (erroFonte) {
    if (erroFonte.code === CODIGO_ERRO_UNICIDADE) {
      return { sucesso: false, erro: ERRO_FONTE_DUPLICADA };
    }
    return { sucesso: false, erro: ERRO_GENERICO_FONTE };
  }

  const { error: erroEvento } = await supabase.from('evento_produto').insert({
    empresa_id: empresaId,
    tipo: 'fonte_adicional_colada',
    payload: { fonte: tipo, url },
  });
  if (erroEvento) {
    console.error('Falha ao registrar evento_produto "fonte_adicional_colada":', erroEvento);
  }

  return { sucesso: true };
}

export async function adicionarFonteComLink(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  link: string,
): Promise<ResultadoAdicionarFonte> {
  const fonte = detectarFonte(link);
  if (!fonte.tipo) {
    return { sucesso: false, erro: fonte.erro };
  }

  return inserirFonteAdicional(supabase, empresaId, fonte.tipo, fonte.url);
}

export function adicionarFonteManual(
  supabase: SupabaseClient<Database>,
  empresaId: string,
): Promise<ResultadoAdicionarFonte> {
  return inserirFonteAdicional(supabase, empresaId, 'manual', null);
}
