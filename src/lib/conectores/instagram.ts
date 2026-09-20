import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { FormularioInstagramInput } from '@/lib/schemas/manual';
import { estruturarEmpresa } from '@/lib/ia/estruturador';
import { gravarCamposExtraidos } from './normalizador';
import { payloadComUso, type UsoTokens } from '@/lib/metricas/custos';

export interface DadosBrutosInstagram {
  handle: string | null;
  bio: string;
  telefoneOuWhatsapp: string | null;
  fotos: string[];
}

export interface ResultadoInstagram {
  status: 'nao_configurado';
}

export interface ResultadoProcessamentoInstagram {
  sucesso: boolean;
}

// Sem integração real com a API do Instagram neste MVP (seção 11 do
// CLAUDE.md) — sempre aciona o fallback manual (bio + telefone/WhatsApp +
// fotos), tratado em app/empresa/[id]/instagram/.
export function verificarInstagram(): ResultadoInstagram {
  return { status: 'nao_configurado' };
}

// Devolve null quando a URL não tem um nome de usuário no caminho (ex.:
// "https://instagram.com" sem perfil) — nesse caso não há handle real para
// usar, e usar o hostname como se fosse o handle inventaria um nome de
// empresa sem sentido (ver estruturarInstagramComFixture, que só marca
// nome/contato.instagram quando o handle existe).
export function extrairHandle(url: string): string | null {
  const analisada = new URL(url);
  const segmento = analisada.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  return segmento || null;
}

// Bio + telefone/WhatsApp são texto semiestruturado — passam pelo mesmo
// estruturador de IA (7.1) usado para o Google, para extrair segmento,
// descrição etc. As fotos, já enviadas ao Storage, entram direto.
// Erros da IA/gravação são capturados aqui (diferente do fluxo do Google,
// que tem seu próprio try/catch em processarFonteDados) para não deixar uma
// exceção não tratada escapar da server action depois que as fotos já foram
// enviadas ao Storage; o status da fonte não é alterado em caso de erro,
// permitindo que o usuário reenvie o mesmo formulário.
export async function processarFallbackInstagram(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  fonteId: string,
  fonteUrl: string,
  dados: FormularioInstagramInput,
  fotos: string[],
): Promise<ResultadoProcessamentoInstagram> {
  const dadosBrutos: DadosBrutosInstagram = {
    handle: extrairHandle(fonteUrl),
    bio: dados.bio ?? '',
    telefoneOuWhatsapp: dados.telefoneOuWhatsapp,
    fotos,
  };

  try {
    let usoIA: UsoTokens | null = null;
    const resultado = await estruturarEmpresa({
      origem: 'instagram',
      dadosBrutos,
      aoUsarIA: (uso) => {
        usoIA = uso;
      },
    });
    await gravarCamposExtraidos(supabase, empresaId, resultado);

    await supabase
      .from('fonte_dados')
      .update({ status: 'ok', bruto: dadosBrutos, coletado_em: new Date().toISOString() })
      .eq('id', fonteId);

    const uso: UsoTokens | null = usoIA;
    const base = { fonte: 'instagram' };
    await supabase.from('evento_produto').insert({
      empresa_id: empresaId,
      tipo: 'extracao_concluida',
      payload: uso !== null ? payloadComUso(base, uso) : base,
    });

    return { sucesso: true };
  } catch (erro) {
    console.error('Falha ao processar o fallback do Instagram:', erro);
    return { sucesso: false };
  }
}
