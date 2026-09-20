import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { FormularioManualInput } from '@/lib/schemas/manual';
import { sincronizarNomeESegmento } from './normalizador';

// Formulário manual já é totalmente estruturado pelo usuário — sem AI
// estruturadora aqui, direto para campo_extraido com confiança máxima.
export async function gravarDadosManual(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  fonteId: string,
  dados: FormularioManualInput,
  fotos: string[],
): Promise<void> {
  const campos: Array<{ campo: string; valor: unknown }> = [
    { campo: 'nome', valor: dados.nome },
    { campo: 'segmento', valor: dados.segmento },
  ];

  if (dados.descricao) campos.push({ campo: 'descricao_curta', valor: dados.descricao });
  if (dados.telefone) campos.push({ campo: 'contato.telefone', valor: dados.telefone });
  if (dados.whatsapp) campos.push({ campo: 'contato.whatsapp', valor: dados.whatsapp });
  if (dados.email) campos.push({ campo: 'contato.email', valor: dados.email });
  if (dados.instagram) campos.push({ campo: 'contato.instagram', valor: dados.instagram });
  if (dados.site) campos.push({ campo: 'contato.site', valor: dados.site });
  if (dados.endereco) campos.push({ campo: 'endereco.texto', valor: dados.endereco });

  const horariosPreenchidos = dados.horarios.filter((horario) => horario.abre && horario.fecha);
  if (horariosPreenchidos.length) {
    campos.push({ campo: 'horarios', valor: horariosPreenchidos });
  }

  const servicos = (dados.servicos ?? '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((nome) => ({ nome, descricao: null }));
  if (servicos.length) campos.push({ campo: 'servicos', valor: servicos });

  if (fotos.length) campos.push({ campo: 'midia.fotos', valor: fotos });

  for (const { campo, valor } of campos) {
    await supabase.from('campo_extraido').insert({
      empresa_id: empresaId,
      campo,
      valor,
      origem: 'manual',
      confianca: 'alta',
    });
  }

  await sincronizarNomeESegmento(supabase, empresaId);

  await supabase
    .from('fonte_dados')
    .update({ status: 'ok', coletado_em: new Date().toISOString() })
    .eq('id', fonteId);
}
