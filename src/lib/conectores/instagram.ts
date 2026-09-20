import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { FormularioInstagramInput } from '@/lib/schemas/manual';
import { estruturarEmpresa } from '@/lib/ia/estruturador';
import { gravarCamposExtraidos } from './normalizador';

export interface DadosBrutosInstagram {
  handle: string;
  bio: string;
  telefoneOuWhatsapp: string | null;
  fotos: string[];
}

export interface ResultadoInstagram {
  status: 'nao_configurado';
}

// Sem integração real com a API do Instagram neste MVP (seção 11 do
// CLAUDE.md) — sempre aciona o fallback manual (bio + telefone/WhatsApp +
// fotos), tratado em app/empresa/[id]/instagram/.
export function verificarInstagram(): ResultadoInstagram {
  return { status: 'nao_configurado' };
}

export function extrairHandle(url: string): string {
  const analisada = new URL(url);
  return analisada.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || analisada.hostname;
}

// Bio + telefone/WhatsApp são texto semiestruturado — passam pelo mesmo
// estruturador de IA (7.1) usado para o Google, para extrair segmento,
// descrição etc. As fotos, já enviadas ao Storage, entram direto.
export async function processarFallbackInstagram(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  fonteId: string,
  fonteUrl: string,
  dados: FormularioInstagramInput,
  fotos: string[],
): Promise<void> {
  const dadosBrutos: DadosBrutosInstagram = {
    handle: extrairHandle(fonteUrl),
    bio: dados.bio ?? '',
    telefoneOuWhatsapp: dados.telefoneOuWhatsapp,
    fotos,
  };

  const resultado = await estruturarEmpresa({ origem: 'instagram', dadosBrutos });
  await gravarCamposExtraidos(supabase, empresaId, resultado);

  await supabase
    .from('fonte_dados')
    .update({ status: 'ok', bruto: dadosBrutos, coletado_em: new Date().toISOString() })
    .eq('id', fonteId);
}
